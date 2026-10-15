import httpx
import json
import os
import time
from typing import Dict, Any, Optional, List
from models.schemas import ModelProvider, ModelOption

# Balanced catalog for contractor hardware (budget laptops → desktop)
# Standard default = gemma3:4b — best intelligence / RAM tradeoff for Side Hustle users
AVAILABLE_MODELS: List[ModelOption] = [
    ModelOption(
        id="gemma3:4b",
        name="Gemma 3 (4B) — Standard",
        provider=ModelProvider.OLLAMA,
        size="4B Parameters",
        vram_required_gb=3.0,
        recommended_min_ram_gb=6.0,
        description="Recommended default. Strong JSON BOM compliance on typical 8GB contractor laptops.",
        is_default=True,
        is_local=True,
    ),
    ModelOption(
        id="gemma3:1b",
        name="Gemma 3 (1B) — Lite",
        provider=ModelProvider.OLLAMA,
        size="1B Parameters",
        vram_required_gb=1.0,
        recommended_min_ram_gb=3.0,
        description="Budget / old PCs. Template-friendly quotes with tight prompts.",
        is_default=False,
        is_local=True,
    ),
    ModelOption(
        id="gemma2:9b",
        name="Gemma 2 (9B) — Power",
        provider=ModelProvider.OLLAMA,
        size="9B Parameters",
        vram_required_gb=6.0,
        recommended_min_ram_gb=12.0,
        description="Richest proposal prose when you have 12GB+ RAM or a dGPU.",
        is_default=False,
        is_local=True,
    ),
    ModelOption(
        id="gemma2:2b",
        name="Gemma 2 (2B) — Lite Alt",
        provider=ModelProvider.OLLAMA,
        size="2B Parameters",
        vram_required_gb=2.0,
        recommended_min_ram_gb=4.0,
        description="Fallback ultra-light if Gemma 3 1B is unavailable locally.",
        is_default=False,
        is_local=True,
    ),
    ModelOption(
        id="qwen2.5:7b",
        name="Qwen 2.5 (7B) — Power Alt",
        provider=ModelProvider.OLLAMA,
        size="7B Parameters",
        vram_required_gb=5.0,
        recommended_min_ram_gb=8.0,
        description="Excellent schema/math fidelity for complex remodel scopes.",
        is_default=False,
        is_local=True,
    ),
    ModelOption(
        id="llama3.1:8b",
        name="Llama 3.1 (8B)",
        provider=ModelProvider.OLLAMA,
        size="8B Parameters",
        vram_required_gb=5.5,
        recommended_min_ram_gb=8.0,
        description="Strong reasoning for multi-trade construction scopes.",
        is_default=False,
        is_local=True,
    ),
    ModelOption(
        id="groq-gemma2-9b",
        name="Gemma 2 9B (Groq Cloud)",
        provider=ModelProvider.GROQ,
        size="9B Parameters",
        vram_required_gb=0.0,
        recommended_min_ram_gb=0.0,
        description="Hosted demo / phone: open-weight Gemma via Groq. Scope sanitized — client PII stays local.",
        is_default=False,
        is_local=False,
    ),
    ModelOption(
        id="groq-llama3.1-8b",
        name="Llama 3.1 8B (Groq Cloud)",
        provider=ModelProvider.GROQ,
        size="8B Parameters",
        vram_required_gb=0.0,
        recommended_min_ram_gb=0.0,
        description="Fast cloud fallback for zero-install demos.",
        is_default=False,
        is_local=False,
    ),
]

QUOTE_SYSTEM_PROMPT = """You are QuoteFlow AI, an expert construction estimating and proposal engine for professional contractors (plumbers, electricians, carpenters, HVAC, painters).
Your mission is to take an informal job scope or voice description and produce an accurate, detailed, itemized Bill of Materials (BOM) and labor quote with a compelling, customer-ready proposal letter.

Output ONLY valid JSON matching this exact schema:
{
  "project_title": "string",
  "project_scope_summary": "string",
  "line_items": [
    {
      "category": "Materials" | "Labor" | "Permits" | "Equipment",
      "description": "string",
      "quantity": float,
      "unit": "string",
      "unit_cost": float,
      "total_cost": float
    }
  ],
  "subtotal_materials": float,
  "subtotal_labor": float,
  "permits_and_fees": float,
  "client_proposal_prose": "string",
  "terms_and_conditions": "string"
}
Make sure all numbers are mathematically consistent. unit_cost * quantity must equal total_cost.
"""

class LLMClient:
    def __init__(self, ollama_url: str = None, groq_key: str = None):
        self.ollama_url = ollama_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.groq_key = groq_key or os.getenv("GROQ_API_KEY", "")

    async def check_ollama_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def _sanitize_prompt_for_cloud(
        self, prompt: str, client_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """Strip client PII before any cloud LLM call — job scope only."""
        sanitized = prompt
        if client_info:
            for key in ("name", "phone", "email", "address"):
                val = str(client_info.get(key) or "").strip()
                if val and len(val) > 2:
                    sanitized = sanitized.replace(val, f"[REDACTED_{key.upper()}]")
        return (
            "PRIVACY NOTE: Client identity and address are withheld. "
            "Estimate from job scope and trade context only.\n" + sanitized
        )

    def _locale_block(self, locale: Optional[Dict[str, Any]] = None) -> str:
        if not locale:
            return (
                "Currency: USD ($). Tax: Sales tax. Units: imperial (feet, inches). "
                "Price all line items in USD.\n"
            )
        code = locale.get("currency_code") or "USD"
        sym = locale.get("currency_symbol") or "$"
        tax_label = locale.get("tax_label") or "Sales tax"
        tax_pct = locale.get("tax_percent")
        units = locale.get("units") or "imperial"
        hourly = locale.get("hourly_rate")
        country = locale.get("country_code") or ""
        unit_hint = (
            "Use imperial units (feet, inches, sq ft, linear ft) where relevant."
            if units == "imperial"
            else "Use metric units (meters, mm, sq m, linear m) where relevant."
        )
        tax_line = f"{tax_label}" + (f" at {tax_pct}%" if tax_pct is not None else "")
        rate_line = f"Contractor labor rate about {sym}{hourly}/hr. " if hourly else ""
        return (
            f"Region: {country or 'local'}. Currency: {code} ({sym}). "
            f"Price EVERY unit_cost and total_cost in {code} using typical local market prices — "
            f"do not invent USD prices when currency is not USD. "
            f"Tax name: {tax_line}. {rate_line}{unit_hint}\n"
        )

    async def generate_quote_json(
        self,
        prompt: str,
        trade: str,
        target_margin: float = 30.0,
        model_id: str = "gemma3:4b",
        provider_preference: Optional[str] = None,
        groq_key_override: Optional[str] = None,
        sanitize_for_cloud: bool = True,
        client_info: Optional[Dict[str, Any]] = None,
        locale: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()

        selected_provider = provider_preference or os.getenv("DEFAULT_MODEL_PROVIDER", "ollama")
        groq_api_key = groq_key_override or self.groq_key

        # Never treat "mock" as a silent Gemma label — explicit offline engine
        if selected_provider == "mock":
            result = self._generate_heuristic_fallback(prompt, trade, target_margin)
            result["llm_provider"] = "offline-heuristic"
            result["llm_model_used"] = "rule-based-estimator"
            result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
            return result

        cloud_prompt = (
            self._sanitize_prompt_for_cloud(prompt, client_info) if sanitize_for_cloud else prompt
        )

        # Strategy 1: Groq
        if selected_provider == "groq" or model_id.startswith("groq-"):
            if groq_api_key:
                try:
                    result = await self._call_groq(
                        cloud_prompt, trade, target_margin, model_id, groq_api_key, locale
                    )
                    result["llm_provider"] = "groq"
                    result["llm_model_used"] = model_id
                    result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                    return result
                except Exception as e:
                    print(f"Groq failed: {e}, attempting fallback...")

        # Strategy 2: Ollama local (full prompt — PII stays on device)
        if selected_provider != "groq":
            ollama_ok = await self.check_ollama_available()
            if ollama_ok:
                try:
                    ollama_model = model_id.replace("groq-", "")
                    if ollama_model.startswith("gemma2-"):
                        ollama_model = "gemma2:9b"
                    result = await self._call_ollama(
                        prompt, trade, target_margin, ollama_model, locale
                    )
                    result["llm_provider"] = "ollama"
                    result["llm_model_used"] = ollama_model
                    result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                    return result
                except Exception as e:
                    print(f"Ollama call failed: {e}")

        # Strategy 3: Groq fallback if key present
        if groq_api_key:
            try:
                result = await self._call_groq(
                    cloud_prompt, trade, target_margin, "gemma2-9b-it", groq_api_key, locale
                )
                result["llm_provider"] = "groq"
                result["llm_model_used"] = "gemma2-9b-it"
                result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                return result
            except Exception as e:
                print(f"Groq fallback failed: {e}")

        # Strategy 4: Honest offline heuristic (demo uptime — not labeled as Gemma)
        result = self._generate_heuristic_fallback(prompt, trade, target_margin)
        result["llm_provider"] = "offline-heuristic"
        result["llm_model_used"] = "rule-based-estimator"
        result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
        return result

    async def _call_ollama(
        self,
        prompt: str,
        trade: str,
        target_margin: float,
        model: str,
        locale: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        user_message = (
            f"{self._locale_block(locale)}"
            f"Trade: {trade}\nTarget Margin: {target_margin}%\nContractor Job Notes: {prompt}"
        )
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": QUOTE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            "format": "json",
            "stream": False
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(f"{self.ollama_url}/api/chat", json=payload)
            data = res.json()
            content = data["message"]["content"]
            return json.loads(content)

    async def _call_groq(
        self,
        prompt: str,
        trade: str,
        target_margin: float,
        model: str,
        api_key: str,
        locale: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        clean_model = "gemma2-9b-it" if "gemma" in model else "llama-3.1-8b-instant"
        user_message = (
            f"{self._locale_block(locale)}"
            f"Trade: {trade}\nTarget Margin: {target_margin}%\nContractor Job Notes: {prompt}"
        )
        payload = {
            "model": clean_model,
            "messages": [
                {"role": "system", "content": QUOTE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    def _generate_heuristic_fallback(self, prompt: str, trade: str, target_margin: float) -> Dict[str, Any]:
        lower_prompt = prompt.lower()
        items = []
        title = f"{trade} Installation & Service"
        
        if "plumb" in trade.lower() or "pipe" in lower_prompt or "leak" in lower_prompt or "heater" in lower_prompt or "bath" in lower_prompt:
            title = "Water Heater & Plumbing Overhaul"
            items = [
                {"category": "Equipment", "description": "High-Efficiency Rheem Performance Unit", "quantity": 1, "unit": "unit", "unit_cost": 1150.0, "total_cost": 1150.0},
                {"category": "Materials", "description": "Brass Valves, PEX-A Tubing & Expansion Fittings", "quantity": 1, "unit": "lot", "unit_cost": 210.0, "total_cost": 210.0},
                {"category": "Materials", "description": "Expansion Tank & Pressure Relief Assembly", "quantity": 1, "unit": "set", "unit_cost": 95.0, "total_cost": 95.0},
                {"category": "Labor", "description": "Certified Master Plumbing Labor & Code Compliance", "quantity": 6.5, "unit": "hours", "unit_cost": 110.0, "total_cost": 715.0},
                {"category": "Permits", "description": "Municipal Plumbing & Safety Inspection Fee", "quantity": 1, "unit": "permit", "unit_cost": 140.0, "total_cost": 140.0}
            ]
        elif "elec" in trade.lower() or "panel" in lower_prompt or "wire" in lower_prompt or "breaker" in lower_prompt:
            title = "Dedicated Electrical Circuit & Sub-Panel Installation"
            items = [
                {"category": "Materials", "description": "Siemens 125A 8-Space Subpanel Enclosure", "quantity": 1, "unit": "panel", "unit_cost": 185.0, "total_cost": 185.0},
                {"category": "Materials", "description": "THHN Feeder Wire 4 AWG & 1-inch EMT Conduit", "quantity": 35, "unit": "ft", "unit_cost": 5.2, "total_cost": 182.0},
                {"category": "Equipment", "description": "Siemens GFCI Dual-Function Circuit Breakers (20A)", "quantity": 4, "unit": "pieces", "unit_cost": 48.0, "total_cost": 192.0},
                {"category": "Labor", "description": "Licensed Journeyman Electrician Installation & Testing", "quantity": 7.0, "unit": "hours", "unit_cost": 118.0, "total_cost": 826.0},
                {"category": "Permits", "description": "City Electrical Plan Review & Final Inspection", "quantity": 1, "unit": "permit", "unit_cost": 165.0, "total_cost": 165.0}
            ]
        elif "carp" in trade.lower() or "remodel" in lower_prompt or "cabinet" in lower_prompt or "deck" in lower_prompt:
            title = "Custom Carpentry & Structural Framing Upgrade"
            items = [
                {"category": "Materials", "description": "Kiln-Dried Douglas Fir 2x6 Framing Lumber & Hardware", "quantity": 28, "unit": "pieces", "unit_cost": 16.5, "total_cost": 462.0},
                {"category": "Materials", "description": "Simpson Strong-Tie Galvanized Structural Fasteners", "quantity": 1, "unit": "box", "unit_cost": 125.0, "total_cost": 125.0},
                {"category": "Materials", "description": "Exterior Moisture-Resistant Sheathing (1/2 in CDX)", "quantity": 12, "unit": "sheets", "unit_cost": 34.0, "total_cost": 408.0},
                {"category": "Labor", "description": "Master Carpenter Framing, Leveling & Finish Work", "quantity": 14.0, "unit": "hours", "unit_cost": 85.0, "total_cost": 1190.0},
                {"category": "Permits", "description": "Building Division Structural Alteration Permit", "quantity": 1, "unit": "permit", "unit_cost": 195.0, "total_cost": 195.0}
            ]
        else:
            title = f"{trade} Professional Contracting Service"
            items = [
                {"category": "Materials", "description": f"Standard Specification Materials for {trade}", "quantity": 1, "unit": "lot", "unit_cost": 480.0, "total_cost": 480.0},
                {"category": "Materials", "description": "Fasteners, Primers & Specialty Consumables", "quantity": 1, "unit": "lot", "unit_cost": 140.0, "total_cost": 140.0},
                {"category": "Labor", "description": f"Skilled {trade} Tradesperson Installation & Cleanup", "quantity": 8.0, "unit": "hours", "unit_cost": 95.0, "total_cost": 760.0},
                {"category": "Permits", "description": "Site Preparation & Disposal Safety Fee", "quantity": 1, "unit": "fee", "unit_cost": 90.0, "total_cost": 90.0}
            ]

        mat_sum = sum(i["total_cost"] for i in items if i["category"] in ["Materials", "Equipment"])
        lab_sum = sum(i["total_cost"] for i in items if i["category"] == "Labor")
        perm_sum = sum(i["total_cost"] for i in items if i["category"] in ["Permits", "Fees"])

        return {
            "project_title": title,
            "project_scope_summary": f"Detailed scope executed for {trade} based on specifications: {prompt[:120]}...",
            "line_items": items,
            "subtotal_materials": mat_sum,
            "subtotal_labor": lab_sum,
            "permits_and_fees": perm_sum,
            "client_proposal_prose": f"Thank you for the opportunity to estimate your {trade.lower()} project. We have evaluated the scope required for '{prompt[:100]}...'. All materials will meet or exceed ASTM and local residential building code standards. Our team handles every step from material acquisition to final jobsite cleanup.",
            "terms_and_conditions": "50% deposit on contract signing, 50% upon final punch-list signoff. 1-year workmanship warranty included."
        }
