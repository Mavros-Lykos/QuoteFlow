# QuoteFlow AI — Software Requirements Specification (SRS)

**Product:** QuoteFlow AI  
**Version:** 1.1  
**Challenge:** Hacktoberfest 2026 Week 2 — Side Hustle  
**Canonical strategy docs:** [`idea_selection.md`](idea_selection.md), [`PRODUCT.md`](PRODUCT.md)  
**Deadline context:** Contest submissions due October 18, 2026  

---

## 1. Purpose

QuoteFlow AI turns informal contractor job notes (voice or text) into a professional, itemized estimate and client proposal in minutes — running open-weight models locally by default so client addresses, job photos, and pricing strategy stay on the contractor’s device.

**Signature claim (positioning):** Time-to-quote **3 hours → ~8 minutes**.

---

## 2. Users & Jobs To Be Done

| Actor | Need |
|-------|------|
| Solo / small-crew contractors (plumbing, electrical, HVAC, carpentry, painting, roofing, GC) | Produce accurate quotes before competitors; protect margins; finish admin without a “second shift” |
| Judges / demo visitors | Click a live demo, generate a quote without installing Ollama, understand open-source AI benefit |

---

## 3. Functional Requirements

### 3.1 Quote generation pipeline (MUST)

1. Accept trade type, job scope (text or voice transcript), optional client info, target margin, model choice.
2. Retrieve similar past jobs (memory / RAG) and inject as context.
3. Fetch regional market labor benchmarks (SerpApi when keyed; offline index otherwise) and **ground** the LLM prompt + labor rate hints.
4. Generate structured BOM JSON + proposal prose via open-weight LLM (Ollama / Groq / heuristic fallback).
5. Run TabPFN (or calibrated fallback) and **apply** suggested price to the quote total with transparent calibration metadata.
6. Persist quote to local SQLite; schedule durable follow-up steps.
7. Return full quote object to UI with partner metadata (model, latency, benchmark, TabPFN, workflow id).

### 3.2 Voice (SHOULD / partner)

1. Upload audio → transcription (ElevenLabs when keyed; clear empty-state messaging otherwise).
2. Text-to-speech readout of proposal summary (ElevenLabs when keyed).

### 3.3 PDF / share (MUST)

1. Server-generated branded PDF download for a quote.
2. Browser print remains available as secondary path.
3. SMS-ready share text copy.

### 3.4 History, status, learning loop (MUST)

1. List / view historical quotes.
2. Update status: `draft` → `sent` → `approved` | `lost` | `expired`.
3. Approved / lost outcomes feed retrieval memory for future estimates.

### 3.5 Model tiers (MUST)

Hardware-aware recommendation for contractors on budget devices:

| Tier | Target | Default engine |
|------|--------|----------------|
| Lite | ≤6 GB RAM | `gemma3:1b` or `gemma2:2b` |
| Standard (default) | 8–12 GB RAM | `gemma3:4b` (best quality/RAM balance) |
| Power | 16 GB+ | `gemma2:9b` / `qwen2.5:7b` / `llama3.1:8b` |
| Cloud | Phone / no Ollama | Groq open-weight models |
| Browser | Future / optional | Documented; not required for v1 ship |

### 3.6 Contractor profile (MUST)

Business name, license, rates, tax, currency, preferred model, terms, theme.

### 3.7 Follow-ups (MUST)

Durable quote lifecycle reminders (default: 72-hour check-in, 7-day expiry alert). Survives process restart via persisted workflow state. Demo mode may use shorter intervals via env.

### 3.8 Observability (SHOULD / partner)

Agent step tracing (latency, tool names, model id) via Sentry when `SENTRY_DSN` is set; no-op otherwise.

### 3.9 Deployed demo (MUST)

1. Render hosts frontend + backend (`render.yaml`).
2. Hosted demo uses **Groq** (or disclosed fallback), never silent “mock Gemma” labeling.
3. README documents local Ollama vs cloud demo modes honestly.

---

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Local-first LLM path: client PII and pricing history never leave the device when provider = Ollama |
| NFR-2 | Market research (SerpApi) and voice (ElevenLabs) are **optional cloud tools**; privacy copy must not claim “100% air-gapped” when those are enabled |
| NFR-3 | Groq cloud mode: prefer sanitized scope (trade + job description without client name/address/phone/email) unless user explicitly opts in |
| NFR-4 | Demo must work without API keys via offline index + heuristic engine, with honest provider labels |
| NFR-5 | WCAG AA contrast; large tap targets for truck / tablet use |
| NFR-6 | Single `pip install` + `npm install` local setup under 5 minutes |

---

## 5. Partner Alignment (Hacktoberfest guide.txt)

| Partner | Prize intent | Ship bar for this SRS |
|---------|--------------|------------------------|
| Gemma | Core open-weight estimator | Default / recommended models are Gemma-family via Ollama or Groq |
| TabPFN | Pricing / win calibration | Real prediction path + **applied** to quote total |
| SerpApi | Live market grounding | Parse search results when possible; always inject rates into agent |
| ElevenLabs | Voice in / proposal out | Wired endpoints; graceful degrade without key |
| Temporal | Skipped (free-tier) | Local SQLite follow-up reminders only — no Temporal Cloud |
| Tiger Data | G3 hybrid memory | SQLite keyword + pgvector cosine + RRF fusion when Tiger connection string set |
| Backboard | Skipped | Not in scope |
| Sentry | Agent tracing | Step spans when DSN set |
| Render | Hosted demo | `render.yaml` + honest model provider |
| .tech | Skipped | Render free `*.onrender.com` URLs are sufficient for this submission |
| Mastra | Agent orchestration | `mastra/` agent + workflow calling FastAPI open-weight tools |
| Backboard | Multi-model compare | Optional stretch — see decision review |
| Mastra | Agent harness | Optional stretch — Python stack today; see decision review |
| DigitalOcean / Tinker | Alt host / fine-tune | Optional stretch |

---

## 6. Out of Scope (v1)

- Full ServiceTitan / Jobber accounting sync  
- Native mobile apps  
- In-browser WebGPU Gemma (documented as future tier)  
- SMS gateway delivery of follow-ups (schedule + in-app alerts only unless keys added)

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Time-to-first-quote (demo) | < 30 s on Groq; < 2 min on local Standard tier |
| Positioning | 3 hours → 8 minutes narrative in UI/README |
| First-user bonus | Real contractor tries 1–2 jobs before submission |
| Honesty | README partner table matches Stub / Partial / Live status |

---

## 8. Architecture (shipped)

```
Browser (Vite + React)
    → FastAPI QuoteAgentOrchestrator
        → Tiger memory → SerpApi benchmarks → LLM (Ollama|Groq|heuristic)
        → TabPFN pricing apply → PDF → Temporal/durable follow-up → SQLite
```

Open innovation story: open-weight models + swap-any-model adapter + optional fully offline LLM path for crown-jewel contractor data.
