import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from models.schemas import GenerateQuoteRequest, Quote, LineItem, ClientInfo, MarketBenchmark, PricingPrediction
from agent.llm_client import LLMClient
from tools.serpapi_tool import SerpApiTool
from tools.tabpfn_tool import TabPFNTool
from tools.temporal_tool import TemporalWorkflowTool
from tools.tiger_tool import TigerDataTool
from tools.sentry_tool import agent_span, capture_agent_event
from db.database import save_quote, get_contractor_profile


class QuoteAgentOrchestrator:
    def __init__(self):
        self.llm_client = LLMClient()
        self.serpapi_tool = SerpApiTool()
        self.tabpfn_tool = TabPFNTool()
        self.temporal_tool = TemporalWorkflowTool()
        self.tiger_tool = TigerDataTool()

    async def generate_complete_quote(self, request: GenerateQuoteRequest) -> Quote:
        zip_code = request.client_info.zip_code if request.client_info else "97401"
        trade = request.trade_type.value
        profile = await get_contractor_profile()

        currency_code = request.currency_code or profile.get("currency_code") or "USD"
        currency_symbol = request.currency_symbol or profile.get("currency_symbol") or "$"
        tax_percent = float(
            request.tax_percent
            if request.tax_percent is not None
            else profile.get("default_tax_percent", 7.5)
        )
        tax_label = request.tax_label or "Sales tax"
        units = request.units or "imperial"
        hourly_rate = float(
            request.hourly_rate
            if request.hourly_rate is not None
            else profile.get("default_hourly_rate", 95.0)
        )
        locale = {
            "currency_code": currency_code,
            "currency_symbol": currency_symbol,
            "tax_percent": tax_percent,
            "tax_label": tax_label,
            "units": units,
            "hourly_rate": hourly_rate,
            "country_code": request.country_code or "",
        }
        money = lambda n: f"{currency_symbol}{float(n):,.2f}"

        with agent_span("tiger_memory_search", {"trade": trade}):
            past_jobs = await self.tiger_tool.search_similar_past_jobs(request.prompt, trade)

        context_enrichment = "\nHistorical reference jobs from contractor memory:\n" + "\n".join(
            [
                f"- {j['title']}: ~{money(j['total'])} ({j.get('notes', '')}) [sim={j.get('similarity_score', 0)}]"
                for j in past_jobs
            ]
        )

        market_benchmark_data = None
        market_hint = ""
        if request.use_live_benchmarks:
            with agent_span("serpapi_market_benchmark", {"zip": zip_code, "trade": trade}):
                bm = await self.serpapi_tool.get_market_benchmark(trade, zip_code)
                market_benchmark_data = MarketBenchmark(**bm)
                market_hint = (
                    f"\nRegional market rates ({bm.get('source')}): "
                    f"avg {money(bm['avg_hourly_rate'])}/hr "
                    f"(range {money(bm['low_hourly_rate'])}-{money(bm['high_hourly_rate'])}/hr) "
                    f"for {trade} near {zip_code}. "
                    f"Contractor default labor is about {money(hourly_rate)}/hr. "
                    f"Price LABOR line items near this band unless scope justifies otherwise. "
                    f"Express costs in {currency_code}.\n"
                )

        enriched_prompt = request.prompt + context_enrichment + market_hint

        with agent_span(
            "llm_generate_quote",
            {"model": request.model_id or "gemma3:4b", "provider": str(request.provider)},
        ):
            llm_response = await self.llm_client.generate_quote_json(
                prompt=enriched_prompt,
                trade=trade,
                target_margin=request.target_margin_percent,
                model_id=request.model_id or "gemma3:4b",
                provider_preference=request.provider.value if request.provider else None,
                groq_key_override=request.groq_api_key,
                sanitize_for_cloud=True,
                client_info=request.client_info.dict() if request.client_info else None,
                locale=locale,
            )

        raw_items = llm_response.get("line_items", [])
        line_items = []
        for idx, itm in enumerate(raw_items):
            line_items.append(
                LineItem(
                    id=str(idx + 1),
                    category=itm.get("category", "Materials"),
                    description=itm.get("description", "Material / Labor item"),
                    quantity=float(itm.get("quantity", 1.0)),
                    unit=itm.get("unit", "units"),
                    unit_cost=float(itm.get("unit_cost", 0.0)),
                    total_cost=float(itm.get("total_cost", 0.0)),
                )
            )

        subtotal_materials = float(
            llm_response.get(
                "subtotal_materials",
                sum(i.total_cost for i in line_items if i.category in ["Materials", "Equipment"]),
            )
        )
        subtotal_labor = float(
            llm_response.get(
                "subtotal_labor",
                sum(i.total_cost for i in line_items if i.category == "Labor"),
            )
        )
        permits_and_fees = float(
            llm_response.get(
                "permits_and_fees",
                sum(i.total_cost for i in line_items if i.category in ["Permits", "Fees"]),
            )
        )

        est_labor_hours = (
            sum(i.quantity for i in line_items if i.category == "Labor" and "hour" in i.unit.lower())
            or 6.0
        )
        market_avg = market_benchmark_data.avg_hourly_rate if market_benchmark_data else None

        with agent_span("tabpfn_pricing", {"trade": trade}):
            pfn_result = await self.tabpfn_tool.predict_pricing(
                trade=trade,
                materials_cost=subtotal_materials,
                labor_hours=est_labor_hours,
                labor_cost=subtotal_labor,
                target_margin=request.target_margin_percent,
                zip_code=zip_code,
                market_avg_hourly=market_avg,
            )
        pricing_prediction = PricingPrediction(**{k: v for k, v in pfn_result.items() if k != "applied_to_total"})

        tax_amount = round(subtotal_materials * (tax_percent / 100.0), 2)
        raw_total = round(subtotal_materials + subtotal_labor + permits_and_fees + tax_amount, 2)

        # Apply TabPFN suggested price as authoritative client total
        suggested = float(pfn_result.get("suggested_price") or raw_total)
        # Keep tax consistent: scale pre-tax subtotal toward suggested, then re-add tax on materials share
        if suggested > 0 and raw_total > 0:
            total_amount = round(suggested, 2)
            # If TabPFN suggestion excludes tax semantics, ensure we don't go below materials+tax floor
            floor = round(subtotal_materials + tax_amount + permits_and_fees * 0.5, 2)
            if total_amount < floor:
                total_amount = raw_total
            calibration_delta = round(total_amount - raw_total, 2)
        else:
            total_amount = raw_total
            calibration_delta = 0.0

        pricing_prediction.rationale = (
            pricing_prediction.rationale
            + f" Applied to quote total (Δ {currency_symbol}{calibration_delta:+.2f} vs raw BOM+{tax_label} {money(raw_total)})."
        )

        quote_id = f"q-{uuid.uuid4().hex[:8]}"
        quote_num = f"QF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        valid_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")

        default_client = request.client_info or ClientInfo(
            name="Valued Customer",
            phone="(555) 000-0000",
            email="customer@example.com",
            address="Jobsite Location",
            zip_code=zip_code,
        )

        with agent_span("temporal_schedule_followup", {"quote_id": quote_id}):
            wf = await self.temporal_tool.schedule_quote_lifecycle_workflow(
                quote_id, default_client.name, total_amount
            )

        quote_obj = Quote(
            id=quote_id,
            quote_number=quote_num,
            created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            client=default_client,
            trade_type=request.trade_type,
            project_title=llm_response.get("project_title", f"{trade} Estimate"),
            project_scope_summary=llm_response.get("project_scope_summary", request.prompt),
            line_items=line_items,
            subtotal_materials=round(subtotal_materials, 2),
            subtotal_labor=round(subtotal_labor, 2),
            permits_and_fees=round(permits_and_fees, 2),
            target_margin_percent=request.target_margin_percent,
            tax_percent=tax_percent,
            tax_amount=tax_amount,
            total_amount=total_amount,
            valid_until=valid_date,
            terms_and_conditions=llm_response.get(
                "terms_and_conditions",
                "50% deposit upon acceptance. Balance upon completion. Workmanship guaranteed for 1 year.",
            ),
            client_proposal_prose=llm_response.get(
                "client_proposal_prose", "Thank you for the opportunity to provide an estimate."
            ),
            llm_model_used=llm_response.get("llm_model_used", request.model_id or "gemma3:4b"),
            llm_provider=llm_response.get("llm_provider", "local"),
            inference_time_ms=float(llm_response.get("inference_time_ms", 1250.0)),
            market_benchmark=market_benchmark_data,
            tabpfn_prediction=pricing_prediction,
            follow_up_workflow_scheduled=True,
            status="draft",
        )

        await save_quote(quote_obj.dict())

        # Tiger G3: upsert into pgvector memory when connection string is set
        try:
            await self.tiger_tool.upsert_job(
                job_id=quote_id,
                title=quote_obj.project_title,
                trade=trade,
                notes=quote_obj.project_scope_summary,
                total=total_amount,
                status="draft",
            )
        except Exception as e:
            print(f"Tiger upsert skipped: {e}")

        capture_agent_event(
            "quote_generated",
            {
                "quote_id": quote_id,
                "total": total_amount,
                "model": quote_obj.llm_model_used,
                "workflow_id": wf.get("workflow_id"),
                "calibration_delta": calibration_delta,
            },
        )
        return quote_obj
