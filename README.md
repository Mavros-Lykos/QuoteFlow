# QuoteFlow AI — Local AI Estimating & Proposal Engine

> **Hacktoberfest 2026: Open-Source AI Challenge (Week 2 — Side Hustle)**  
> *Contractor estimating: **3 hours → ~8 minutes**, with open-weight models and local-first privacy for client data.*

[![Open-Source AI](https://img.shields.io/badge/Open--Source%20AI-Gemma%20%7C%20Llama%20%7C%20Qwen-f59e0b)](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)
[![Privacy](https://img.shields.io/badge/Privacy-Local--First%20LLM-10b981)](#privacy-model)
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6.svg)](LICENSE)

**Specs:** [`SRS.md`](SRS.md) · **Product:** [`PRODUCT.md`](PRODUCT.md) · **Strategy:** [`idea_selection.md`](idea_selection.md) · **Open decisions:** [`DECISION_REVIEW.md`](DECISION_REVIEW.md)

---

## The problem

Independent tradespeople finish a physical workday, then spend 2.5–3.5 hours writing quotes. Slow quotes lose jobs; rushed quotes destroy margins. Client addresses and pricing strategy should not be dumped into generic cloud chatbots.

## What QuoteFlow does

1. Voice or text job notes → itemized BOM (Materials, Labor, Equipment, Permits)
2. **SerpApi** (optional key) grounds labor rates by ZIP; offline index otherwise
3. **TabPFN calibration** suggests and **applies** a win-rate-aware total
4. Open-weight LLM (Gemma 3 4B default via Ollama, or Groq) drafts the client proposal
5. **Branded PDF** download + Temporal-style durable follow-ups (SQLite-persisted)
6. **ElevenLabs** STT/TTS when keyed; browser speech fallback for readout

---

## Privacy model

| Data | Local Ollama | Groq cloud | SerpApi / ElevenLabs |
|------|--------------|------------|----------------------|
| Client name / address / phone | Stays on device | **Redacted** before send | Not sent (voice audio only for STT) |
| Job scope / trade | On device | Sent (sanitized) | ZIP + trade for market search |
| Quote history / margins | SQLite on device | Not uploaded | Not uploaded |

**“Local-first”** means the **LLM path for crown-jewel data** can run fully offline. Market research and voice are optional cloud tools — they are not claimed as air-gapped.

---

## Partner status (honest)

| Partner | Status | Notes |
|---------|--------|-------|
| Gemma | **Live** | Default `gemma3:4b`; Power `gemma2:9b`; Groq Gemma for hosted demos |
| TabPFN | **Partial → Live path** | Applied to quote totals; Prior Labs API when keyed, else local tabular calibration |
| SerpApi | **Partial → Live path** | Parses $/hr from results when possible; always injects rates into agent |
| ElevenLabs | **Live when keyed** | STT + TTS endpoints; empty transcript without key |
| Temporal | **Durable (SQLite)** | Follow-ups survive restart; Temporal SDK attach via `TEMPORAL_ENABLED` |
| Tiger Data | **G3 hybrid** | SQLite always + **pgvector** upsert/search when `TIGER_DATA_CONNECTION_STRING` is set (`GET /api/memory/status`) |
| Sentry | **Live when DSN set** | Agent step spans on quote pipeline |
| Render | **Configured** | `render.yaml` uses **Groq** (set `GROQ_API_KEY` secret), not silent mock |
| Mastra | **Live (sidecar)** | Agent + workflow in [`mastra/`](mastra/) orchestrating FastAPI tools |
| Backboard | **Skipped** | Not using |
| Temporal | **Skipped** | Free-tier focus; simple local follow-up reminders only (not Temporal Cloud) |
| .tech Domains | **Skipped** | Deploy on Render free URL (`*.onrender.com`) |

---

## Quickstart

### Prerequisites
- Node.js 18+
- Python 3.10+
- Optional: [Ollama](https://ollama.com) — `ollama pull gemma3:4b`
- Optional: Groq API key for cloud demos

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
python main.py
```
API: `http://127.0.0.1:8000` · Docs: `/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
UI: `http://localhost:5173`

### Desktop (Tauri 2 — Windows)

Local-first shell lives under `frontend/src-tauri/` (Vite + Tauri layout). Data is stored under `%APPDATA%\QuoteFlow`.

```bash
cd frontend
npm install
npm run tauri:dev      # spawns backend via Python from ../backend
npm run tauri:build    # NSIS installer (requires Rust toolchain)
```

Optional offline backend sidecar (PyInstaller):

```powershell
.\scripts\build-sidecar.ps1
```

Then rebuild with `npm run tauri:build`. Without the sidecar, release builds fall back to spawning `python main.py` when Python is on PATH.

For production builds pointed at a hosted API:
```bash
# frontend/.env.production
VITE_API_BASE=https://YOUR-BACKEND.onrender.com/api
```

### Render (free default domain — no .tech required)
1. Blueprint from `render.yaml` → you get `https://quoteflow-frontend.onrender.com` style URLs
2. Set secret `GROQ_API_KEY` on the backend service (required for hosted LLM)
3. Optionally SerpApi / ElevenLabs / Sentry / TabPFN keys
4. Set frontend `VITE_API_BASE` at build time to `https://<backend-service>.onrender.com/api`
5. Mastra Studio: run locally (`cd mastra && npm run dev`) for partner screenshots; optional second Render service later

---

## Model tiers (contractor hardware)

| Tier | RAM | Model |
|------|-----|-------|
| Lite | ≤5 GB | `gemma3:1b` |
| **Standard (default)** | 6–10 GB | **`gemma3:4b`** |
| Power | 12 GB+ | `gemma2:9b` / `qwen2.5:7b` |
| Cloud demo | any | Groq open-weight Gemma / Llama |

Browser WebGPU tier is documented in SRS as future — not required for v1.

---

## License
MIT. Built for Hacktoberfest 2026.
