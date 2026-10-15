import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import dotenv

dotenv.load_dotenv()

from models.schemas import (
    Quote,
    GenerateQuoteRequest,
    ModelOption,
    HardwareSpec,
    TradeType,
    ContractorProfile,
)
from db.database import (
    init_db,
    get_all_quotes,
    get_quote_by_id,
    get_contractor_profile,
    save_contractor_profile,
    update_quote_status,
    get_followup_for_quote,
)
from agent.orchestrator import QuoteAgentOrchestrator
from agent.llm_client import AVAILABLE_MODELS
from tools.serpapi_tool import SerpApiTool
from tools.elevenlabs_tool import ElevenLabsTool
from tools.temporal_tool import TemporalWorkflowTool
from tools.pdf_tool import generate_quote_pdf
from tools.sentry_tool import init_sentry
from tools.tiger_tool import TigerDataTool

orchestrator = QuoteAgentOrchestrator()
serpapi_tool = SerpApiTool()
elevenlabs_tool = ElevenLabsTool()
temporal_tool = TemporalWorkflowTool()
tiger_tool = TigerDataTool()


async def _followup_worker():
    """Background poller for durable follow-up steps (survives via SQLite state)."""
    while True:
        try:
            due = await temporal_tool.list_due_followups()
            for item in due:
                print(
                    f"[FollowUp] {item.get('step')} for quote {item.get('quote_id')} "
                    f"— {item.get('action')}"
                )
                await temporal_tool.mark_step_done(item["workflow_id"], item["step"])
        except Exception as e:
            print(f"Follow-up worker error: {e}")
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_sentry()
    await init_db()
    worker = asyncio.create_task(_followup_worker())
    yield
    worker.cancel()
    try:
        await worker
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="QuoteFlow AI API",
    description="Local AI Estimating & Proposal Engine for Independent Contractors",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    ollama_status = await orchestrator.llm_client.check_ollama_available()
    default_provider = os.getenv("DEFAULT_MODEL_PROVIDER", "ollama")
    return {
        "status": "healthy",
        "service": "QuoteFlow AI",
        "ollama_connected": ollama_status,
        "default_model": os.getenv("OLLAMA_MODEL", "gemma3:4b"),
        "default_provider": default_provider,
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
    }


@app.get("/api/profile", response_model=ContractorProfile)
async def get_profile():
    prof = await get_contractor_profile()
    return ContractorProfile(**prof)


@app.post("/api/profile", response_model=ContractorProfile)
async def update_profile(profile: ContractorProfile):
    await save_contractor_profile(profile.dict())
    return profile


@app.get("/api/models", response_model=List[ModelOption])
async def get_models():
    return AVAILABLE_MODELS


@app.post("/api/hardware/recommend")
async def recommend_model(spec: HardwareSpec):
    ram = spec.device_memory_gb or 8.0
    if ram < 5.0:
        rec = "gemma3:1b"
        reason = "Detected limited RAM (<5GB). Gemma 3 1B keeps quoting usable on older laptops."
    elif ram < 10.0:
        rec = "gemma3:4b"
        reason = "Detected 5–10GB RAM. Gemma 3 4B is the best quality/speed balance for trade BOMs."
    elif ram < 14.0:
        rec = "qwen2.5:7b"
        reason = "Detected 10–14GB RAM. Qwen 2.5 7B or Gemma 2 9B recommended for deeper proposals."
    else:
        rec = "gemma2:9b"
        reason = "High-RAM device. Gemma 2 9B for richest proposal prose."

    return {
        "recommended_model_id": rec,
        "rationale": reason,
        "can_run_local": True,
        "cloud_alternative": "groq-gemma2-9b",
    }


@app.get("/api/quotes", response_model=List[Quote])
async def list_quotes():
    quotes = await get_all_quotes()
    return quotes


@app.get("/api/quotes/{quote_id}")
async def get_quote(quote_id: str):
    q = await get_quote_by_id(quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q


@app.patch("/api/quotes/{quote_id}/status")
async def patch_quote_status(quote_id: str, status: str):
    allowed = {"draft", "sent", "approved", "lost", "expired", "completed"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(allowed)}")
    ok = await update_quote_status(quote_id, status)
    if not ok:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"id": quote_id, "status": status}


@app.get("/api/quotes/{quote_id}/followup")
async def get_quote_followup(quote_id: str):
    wf = await get_followup_for_quote(quote_id)
    if not wf:
        raise HTTPException(status_code=404, detail="No follow-up workflow for this quote")
    return wf


@app.get("/api/quotes/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str):
    q = await get_quote_by_id(quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    profile = await get_contractor_profile()
    pdf_bytes = generate_quote_pdf(q, profile)
    filename = f"{q.get('quote_number', quote_id)}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/quotes/generate", response_model=Quote)
async def generate_quote(req: GenerateQuoteRequest):
    try:
        quote = await orchestrator.generate_complete_quote(req)
        return quote
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quote generation error: {str(e)}")


@app.get("/api/benchmarks")
async def get_benchmark(trade: str = "Plumbing", zip_code: str = "97401"):
    return await serpapi_tool.get_market_benchmark(trade, zip_code)


@app.post("/api/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    audio_data = await file.read()
    transcript = await elevenlabs_tool.transcribe_audio(audio_data, file.filename)
    return {"transcript": transcript}


@app.post("/api/voice/readout")
async def readout_proposal(text: str = Form(...)):
    audio_bytes = await elevenlabs_tool.generate_speech_audio(text)
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Voice synthesis requires ELEVENLABS_API_KEY")
    return Response(content=audio_bytes, media_type="audio/mpeg")


@app.get("/api/followups/due")
async def list_due_followups():
    return await temporal_tool.list_due_followups()


@app.get("/api/memory/status")
async def memory_status():
    """Tiger Data G3 hybrid status (SQLite always; pgvector when configured)."""
    return await tiger_tool.status()


@app.get("/api/stats")
async def get_contractor_stats():
    quotes = await get_all_quotes()
    total_quoted = sum(q["total_amount"] for q in quotes)
    approved_quotes = [q for q in quotes if q.get("status") == "approved"]
    lost_quotes = [q for q in quotes if q.get("status") == "lost"]
    decided = len(approved_quotes) + len(lost_quotes)
    win_rate = (len(approved_quotes) / decided * 100) if decided else (
        (len(approved_quotes) / len(quotes) * 100) if quotes else 0.0
    )
    # Measured from stored inference latency when available
    latencies = [q.get("inference_time_ms") or 0 for q in quotes if q.get("inference_time_ms")]
    avg_inference_ms = round(sum(latencies) / len(latencies), 1) if latencies else 0.0
    # Positioning claim retained separately from measured stats
    return {
        "total_quotes_count": len(quotes),
        "total_quoted_volume": round(total_quoted, 2),
        "approved_quotes_count": len(approved_quotes),
        "lost_quotes_count": len(lost_quotes),
        "win_rate_percent": round(win_rate, 1),
        "avg_inference_ms": avg_inference_ms,
        "avg_estimating_time_minutes": 8.0,
        "legacy_turnaround_hours": 3.0,
        "hours_saved_month": round(len(quotes) * (3.0 - (8.0 / 60.0)), 1) if quotes else 42.5,
        "metric_note": "avg_estimating_time_minutes / legacy_turnaround_hours are product positioning targets (3h → 8m), not stopwatch telemetry.",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
