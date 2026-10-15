import aiosqlite
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

def _resolve_db_path() -> str:
    data_dir = os.environ.get("QUOTEFLOW_DATA_DIR", "").strip()
    if data_dir:
        os.makedirs(data_dir, exist_ok=True)
        return os.path.join(data_dir, "quoteflow.db")
    return os.path.join(os.path.dirname(__file__), "quoteflow.db")


DB_PATH = _resolve_db_path()

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS quotes (
                id TEXT PRIMARY KEY,
                quote_number TEXT NOT NULL,
                created_at TEXT NOT NULL,
                client_json TEXT NOT NULL,
                trade_type TEXT NOT NULL,
                project_title TEXT NOT NULL,
                project_scope_summary TEXT NOT NULL,
                line_items_json TEXT NOT NULL,
                subtotal_materials REAL NOT NULL,
                subtotal_labor REAL NOT NULL,
                permits_and_fees REAL NOT NULL,
                target_margin_percent REAL NOT NULL,
                tax_percent REAL NOT NULL,
                tax_amount REAL NOT NULL,
                total_amount REAL NOT NULL,
                valid_until TEXT NOT NULL,
                terms_and_conditions TEXT NOT NULL,
                client_proposal_prose TEXT NOT NULL,
                llm_model_used TEXT NOT NULL,
                llm_provider TEXT NOT NULL,
                inference_time_ms REAL NOT NULL,
                market_benchmark_json TEXT,
                tabpfn_prediction_json TEXT,
                follow_up_workflow_scheduled INTEGER DEFAULT 0,
                status TEXT DEFAULT 'draft'
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS contractor_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                contractor_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                license_number TEXT NOT NULL,
                default_hourly_rate REAL NOT NULL,
                default_markup_percent REAL NOT NULL,
                terms_template TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS followup_workflows (
                workflow_id TEXT PRIMARY KEY,
                quote_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Check if seed data exists (skip when QUOTEFLOW_SEED=0, e.g. desktop app)
        seed_ok = os.environ.get("QUOTEFLOW_SEED", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )
        async with db.execute("SELECT COUNT(*) FROM quotes") as cursor:
            count = (await cursor.fetchone())[0]
            if count == 0 and seed_ok:
                await seed_database(db)
                
        await db.commit()

async def seed_database(db):
    default_profile = (
        "Apex Trade Services LLC",
        "Marcus Vance",
        "(555) 234-8901",
        "marcus@apextradeservices.com",
        "LIC #CA-984321-B",
        95.0,
        30.0,
        "Payment terms: 50% deposit upon acceptance, 50% upon satisfactory completion. All materials warrantied for 1 year. Quote valid for 30 days."
    )
    await db.execute("""
        INSERT INTO contractor_profile 
        (business_name, contractor_name, phone, email, license_number, default_hourly_rate, default_markup_percent, terms_template)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, default_profile)

    seed_quotes = [
        {
            "id": "q-101",
            "quote_number": "QF-2026-001",
            "created_at": "2026-10-10T14:30:00Z",
            "client": {
                "name": "Sarah Jenkins",
                "phone": "(555) 912-4433",
                "email": "sarah.j@example.com",
                "address": "742 Evergreen Terrace",
                "zip_code": "97477"
            },
            "trade_type": "Plumbing",
            "project_title": "Tankless Water Heater Conversion & Line Reroute",
            "project_scope_summary": "Remove existing 50-gal electric water tank. Install Navien NPE-240A2 condensing tankless unit, upgrade gas line to 3/4 inch, and install exterior vent termination.",
            "line_items": [
                {"id": "1", "category": "Equipment", "description": "Navien NPE-240A2 Condensing Tankless Water Heater", "quantity": 1, "unit": "unit", "unit_cost": 1780.0, "total_cost": 1780.0},
                {"id": "2", "category": "Materials", "description": "3/4 inch Black Iron Gas Pipe & Fittings (30 ft)", "quantity": 1, "unit": "lot", "unit_cost": 290.0, "total_cost": 290.0},
                {"id": "3", "category": "Materials", "description": "2-inch PVC Concentric Vent Kit & Flashing", "quantity": 1, "unit": "kit", "unit_cost": 165.0, "total_cost": 165.0},
                {"id": "4", "category": "Labor", "description": "Master Plumber Removal, Mounting & Gas Tie-in", "quantity": 8.5, "unit": "hours", "unit_cost": 115.0, "total_cost": 977.5},
                {"id": "5", "category": "Permits", "description": "City Mechanical & Plumbing Permit with Inspection", "quantity": 1, "unit": "permit", "unit_cost": 185.0, "total_cost": 185.0}
            ],
            "subtotal_materials": 2235.0,
            "subtotal_labor": 977.5,
            "permits_and_fees": 185.0,
            "target_margin_percent": 30.0,
            "tax_percent": 7.5,
            "tax_amount": 167.63,
            "total_amount": 3565.13,
            "valid_until": "2026-11-09",
            "terms_and_conditions": "50% upfront, balance upon final city inspection pass. 5-year craftsmanship warranty.",
            "client_proposal_prose": "Dear Sarah,\n\nThank you for reaching out regarding your water heater upgrade. Switching to the Navien NPE-240A2 high-efficiency tankless system will eliminate hot water depletion while reducing your utility bill by up to 25%. Our quote includes complete removal and safe recycling of your old unit, code-compliant gas supply upsizing, concentric venting, and full permit processing.",
            "llm_model_used": "gemma2:9b",
            "llm_provider": "ollama",
            "inference_time_ms": 1420.0,
            "status": "approved"
        },
        {
            "id": "q-102",
            "quote_number": "QF-2026-002",
            "created_at": "2026-10-12T09:15:00Z",
            "client": {
                "name": "David Ramirez",
                "phone": "(555) 304-1189",
                "email": "d.ramirez@example.com",
                "address": "1208 Crestview Blvd",
                "zip_code": "97401"
            },
            "trade_type": "Electrical",
            "project_title": "200A Main Service Panel Upgrade & EV Charger Circuit",
            "project_scope_summary": "Upgrade outdated Zinsco 100A panel to modern 200A Square D QO panel with whole-home surge protector. Run 50A dedicated 240V circuit to garage for Level 2 EV charging.",
            "line_items": [
                {"id": "1", "category": "Materials", "description": "Square D 200A 40-Space Outdoor Main Breaker Panel", "quantity": 1, "unit": "panel", "unit_cost": 420.0, "total_cost": 420.0},
                {"id": "2", "category": "Materials", "description": "Whole-Home Type 2 Surge Protection Device (SPD)", "quantity": 1, "unit": "unit", "unit_cost": 160.0, "total_cost": 160.0},
                {"id": "3", "category": "Materials", "description": "6/3 NM-B Romex Cable & NEMA 14-50 Receptacle", "quantity": 45, "unit": "ft", "unit_cost": 4.5, "total_cost": 202.5},
                {"id": "4", "category": "Labor", "description": "Licensed Electrician Service Panel Replacement & Utility Coordination", "quantity": 10.0, "unit": "hours", "unit_cost": 125.0, "total_cost": 1250.0},
                {"id": "5", "category": "Permits", "description": "Electrical Service Upgrade Permit & Utility Disconnect Coordination", "quantity": 1, "unit": "permit", "unit_cost": 240.0, "total_cost": 240.0}
            ],
            "subtotal_materials": 782.5,
            "subtotal_labor": 1250.0,
            "permits_and_fees": 240.0,
            "target_margin_percent": 30.0,
            "tax_percent": 7.5,
            "tax_amount": 58.69,
            "total_amount": 2331.19,
            "valid_until": "2026-11-11",
            "terms_and_conditions": "Utility shutdown requires 48hr notice. Full panel labeled with typed circuit directory.",
            "client_proposal_prose": "Dear David,\n\nWe are pleased to provide an estimate for modernizing your home's electrical service. Upgrading from your 100A panel to a 200A system will safely accommodate your new EV charger and protect high-value electronics with whole-home surge defense.",
            "llm_model_used": "gemma2:9b",
            "llm_provider": "ollama",
            "inference_time_ms": 1180.0,
            "status": "sent"
        }
    ]

    for q in seed_quotes:
        await db.execute("""
            INSERT INTO quotes (
                id, quote_number, created_at, client_json, trade_type, project_title,
                project_scope_summary, line_items_json, subtotal_materials, subtotal_labor,
                permits_and_fees, target_margin_percent, tax_percent, tax_amount, total_amount,
                valid_until, terms_and_conditions, client_proposal_prose, llm_model_used,
                llm_provider, inference_time_ms, market_benchmark_json, tabpfn_prediction_json,
                follow_up_workflow_scheduled, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["id"],
            q["quote_number"],
            q["created_at"],
            json.dumps(q["client"]),
            q["trade_type"],
            q["project_title"],
            q["project_scope_summary"],
            json.dumps(q["line_items"]),
            q["subtotal_materials"],
            q["subtotal_labor"],
            q["permits_and_fees"],
            q["target_margin_percent"],
            q["tax_percent"],
            q["tax_amount"],
            q["total_amount"],
            q["valid_until"],
            q["terms_and_conditions"],
            q["client_proposal_prose"],
            q["llm_model_used"],
            q["llm_provider"],
            q["inference_time_ms"],
            json.dumps({"trade": q["trade_type"], "region_zip": q["client"]["zip_code"], "avg_hourly_rate": 115.0, "low_hourly_rate": 95.0, "high_hourly_rate": 140.0, "source": "SerpApi Regional Index", "retrieved_at": "2026-10-10"}),
            json.dumps({"suggested_price": q["total_amount"], "confidence_score": 0.94, "recommended_range_min": q["total_amount"] * 0.95, "recommended_range_max": q["total_amount"] * 1.08, "model_used": "TabPFN-3.5", "rationale": "High win-probability based on historical 2026 regional conversions."}),
            1,
            q["status"]
        ))

async def save_quote(quote: Dict[str, Any]) -> str:
    db = await get_db()
    try:
        await db.execute("""
            INSERT INTO quotes (
                id, quote_number, created_at, client_json, trade_type, project_title,
                project_scope_summary, line_items_json, subtotal_materials, subtotal_labor,
                permits_and_fees, target_margin_percent, tax_percent, tax_amount, total_amount,
                valid_until, terms_and_conditions, client_proposal_prose, llm_model_used,
                llm_provider, inference_time_ms, market_benchmark_json, tabpfn_prediction_json,
                follow_up_workflow_scheduled, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            quote["id"],
            quote["quote_number"],
            quote["created_at"],
            json.dumps(quote["client"] if isinstance(quote["client"], dict) else quote["client"].dict()),
            quote["trade_type"],
            quote["project_title"],
            quote["project_scope_summary"],
            json.dumps(quote["line_items"] if isinstance(quote["line_items"], list) and isinstance(quote["line_items"][0], dict) else [item.dict() for item in quote["line_items"]]),
            quote["subtotal_materials"],
            quote["subtotal_labor"],
            quote["permits_and_fees"],
            quote["target_margin_percent"],
            quote["tax_percent"],
            quote["tax_amount"],
            quote["total_amount"],
            quote["valid_until"],
            quote["terms_and_conditions"],
            quote["client_proposal_prose"],
            quote["llm_model_used"],
            quote["llm_provider"],
            quote["inference_time_ms"],
            json.dumps(quote.get("market_benchmark")),
            json.dumps(quote.get("tabpfn_prediction")),
            1 if quote.get("follow_up_workflow_scheduled") else 0,
            quote.get("status", "draft")
        ))
        await db.commit()
        return quote["id"]
    finally:
        await db.close()

async def get_all_quotes() -> List[Dict[str, Any]]:
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM quotes ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                r["client"] = json.loads(r["client_json"])
                r["line_items"] = json.loads(r["line_items_json"])
                r["market_benchmark"] = json.loads(r["market_benchmark_json"]) if r["market_benchmark_json"] else None
                r["tabpfn_prediction"] = json.loads(r["tabpfn_prediction_json"]) if r["tabpfn_prediction_json"] else None
                del r["client_json"]
                del r["line_items_json"]
                del r["market_benchmark_json"]
                del r["tabpfn_prediction_json"]
                results.append(r)
            return results
    finally:
        await db.close()

async def get_contractor_profile() -> Dict[str, Any]:
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM contractor_profile ORDER BY id DESC LIMIT 1") as cursor:
            row = await cursor.fetchone()
            if row:
                r = dict(row)
                return {
                    "business_name": r.get("business_name") or "",
                    "contractor_name": r.get("contractor_name") or "",
                    "phone": r.get("phone") or "",
                    "email": r.get("email") or "",
                    "license_number": r.get("license_number") or "",
                    "currency_code": r.get("currency_code") or "USD",
                    "currency_symbol": r.get("currency_symbol") or "$",
                    "default_hourly_rate": float(r.get("default_hourly_rate") or 95.0),
                    "default_markup_percent": float(r.get("default_markup_percent") or 30.0),
                    "default_tax_percent": float(r.get("default_tax_percent") if r.get("default_tax_percent") is not None else 7.5),
                    "default_trade": r.get("default_trade") or "Plumbing",
                    "preferred_model_id": r.get("preferred_model_id") or "gemma3:4b",
                    "terms_template": r.get("terms_template")
                    or "50% deposit on acceptance, balance on completion. Estimate valid for 30 days.",
                    "theme": r.get("theme") or "light",
                }
            return {
                "business_name": "",
                "contractor_name": "",
                "phone": "",
                "email": "",
                "license_number": "",
                "currency_code": "USD",
                "currency_symbol": "$",
                "default_hourly_rate": 95.0,
                "default_markup_percent": 30.0,
                "default_tax_percent": 7.5,
                "default_trade": "Plumbing",
                "preferred_model_id": "gemma3:4b",
                "terms_template": "50% deposit on acceptance, balance on completion. Estimate valid for 30 days.",
                "theme": "light",
            }
    finally:
        await db.close()

async def save_contractor_profile(p: Dict[str, Any]):
    db = await get_db()
    try:
        # Check if table has updated columns
        try:
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN currency_code TEXT DEFAULT 'USD'")
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN currency_symbol TEXT DEFAULT '$'")
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN default_tax_percent REAL DEFAULT 7.5")
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN default_trade TEXT DEFAULT 'Plumbing'")
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN preferred_model_id TEXT DEFAULT 'gemma2:9b'")
            await db.execute("ALTER TABLE contractor_profile ADD COLUMN theme TEXT DEFAULT 'industrial'")
            await db.commit()
        except Exception:
            pass

        await db.execute("""
            INSERT INTO contractor_profile 
            (business_name, contractor_name, phone, email, license_number, currency_code, currency_symbol, default_hourly_rate, default_markup_percent, default_tax_percent, default_trade, preferred_model_id, terms_template, theme)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p.get("business_name") or "",
            p.get("contractor_name") or "",
            p.get("phone") or "",
            p.get("email") or "",
            p.get("license_number") or "",
            p.get("currency_code") or "USD",
            p.get("currency_symbol") or "$",
            float(p.get("default_hourly_rate") or 95.0),
            float(p.get("default_markup_percent") or 30.0),
            float(p.get("default_tax_percent") if p.get("default_tax_percent") is not None else 7.5),
            p.get("default_trade") or "Plumbing",
            p.get("preferred_model_id") or "gemma3:4b",
            p.get("terms_template") or "50% deposit on acceptance, balance on completion.",
            p.get("theme") or "light",
        ))
        await db.commit()
    finally:
        await db.close()


async def get_quote_by_id(quote_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            r = dict(row)
            r["client"] = json.loads(r["client_json"])
            r["line_items"] = json.loads(r["line_items_json"])
            r["market_benchmark"] = json.loads(r["market_benchmark_json"]) if r["market_benchmark_json"] else None
            r["tabpfn_prediction"] = json.loads(r["tabpfn_prediction_json"]) if r["tabpfn_prediction_json"] else None
            del r["client_json"]
            del r["line_items_json"]
            del r["market_benchmark_json"]
            del r["tabpfn_prediction_json"]
            return r
    finally:
        await db.close()


async def update_quote_status(quote_id: str, status: str) -> bool:
    db = await get_db()
    ok = False
    try:
        cur = await db.execute(
            "UPDATE quotes SET status = ? WHERE id = ?",
            (status, quote_id),
        )
        await db.commit()
        ok = cur.rowcount > 0
    finally:
        await db.close()

    # Sync win/loss into Tiger pgvector memory when available
    if ok:
        try:
            q = await get_quote_by_id(quote_id)
            if q:
                from tools.tiger_tool import TigerDataTool

                await TigerDataTool().upsert_job(
                    job_id=quote_id,
                    title=q.get("project_title") or "",
                    trade=q.get("trade_type") or "",
                    notes=q.get("project_scope_summary") or "",
                    total=float(q.get("total_amount") or 0),
                    status=status,
                )
        except Exception as e:
            print(f"Tiger status sync skipped: {e}")
    return ok


async def save_followup_workflow(record: Dict[str, Any]) -> None:
    db = await get_db()
    try:
        await db.execute(
            """
            INSERT OR REPLACE INTO followup_workflows
            (workflow_id, quote_id, payload_json, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                record["workflow_id"],
                record["quote_id"],
                json.dumps(record),
                record.get("status", "RUNNING_DURABLE"),
                record.get("created_at", datetime.utcnow().isoformat() + "Z"),
            ),
        )
        await db.commit()
    finally:
        await db.close()


async def get_due_followups() -> List[Dict[str, Any]]:
    """Return workflows that have at least one scheduled step due now."""
    db = await get_db()
    now = datetime.utcnow()
    due: List[Dict[str, Any]] = []
    try:
        async with db.execute("SELECT payload_json FROM followup_workflows WHERE status = 'RUNNING_DURABLE'") as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                payload = json.loads(row[0])
                for step in payload.get("steps") or []:
                    if step.get("status") != "scheduled":
                        continue
                    due_raw = step.get("due_at_iso") or ""
                    try:
                        due_at = datetime.fromisoformat(due_raw.replace("Z", ""))
                    except Exception:
                        continue
                    if due_at <= now:
                        due.append({
                            "workflow_id": payload.get("workflow_id"),
                            "quote_id": payload.get("quote_id"),
                            "client_name": payload.get("client_name"),
                            "step": step.get("step"),
                            "action": step.get("action"),
                            "due_at_iso": due_raw,
                        })
        return due
    finally:
        await db.close()


async def mark_followup_step_done(workflow_id: str, step_name: str) -> None:
    db = await get_db()
    try:
        async with db.execute(
            "SELECT payload_json FROM followup_workflows WHERE workflow_id = ?",
            (workflow_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return
            payload = json.loads(row[0])
            for step in payload.get("steps") or []:
                if step.get("step") == step_name:
                    step["status"] = "done"
                    step["completed_at"] = datetime.utcnow().isoformat() + "Z"
            remaining = [s for s in payload.get("steps") or [] if s.get("status") == "scheduled"]
            if not remaining:
                payload["status"] = "COMPLETED"
            await db.execute(
                "UPDATE followup_workflows SET payload_json = ?, status = ? WHERE workflow_id = ?",
                (json.dumps(payload), payload["status"], workflow_id),
            )
            await db.commit()
    finally:
        await db.close()


async def get_followup_for_quote(quote_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        async with db.execute(
            "SELECT payload_json FROM followup_workflows WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1",
            (quote_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            return json.loads(row[0])
    finally:
        await db.close()

