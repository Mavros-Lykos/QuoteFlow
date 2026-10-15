# QuoteFlow × Mastra

Mastra agent + workflow that **orchestrates** QuoteFlow’s open-weight estimating pipeline (FastAPI + Gemma/Ollama|Groq + TabPFN + SerpApi + durable follow-ups).

## Why Mastra is here

Hacktoberfest **Best Use of Mastra**: orchestrate an agent over open models with tools/memory-style workflows — without rewriting the Python estimators.

| Piece | Role |
|-------|------|
| `quoteAgent` | Tool-calling agent (market rates, list quotes, generate quote) |
| `quoteWorkflow` | Deterministic steps: SerpApi benchmark → full quote generate |
| FastAPI tools | Actual Gemma / TabPFN / Tiger memory / Temporal persistence |

## Setup

```bash
# Terminal 1 — FastAPI
cd ../backend && python main.py

# Terminal 2 — Mastra
cd ../mastra
cp .env.example .env   # set OPENAI_API_KEY (or GOOGLE_API_KEY) for the agent router
npm install
npm run dev            # Mastra Studio
# or
npm run generate       # CLI workflow smoke test
```

`QUOTEFLOW_API_BASE` defaults to `http://127.0.0.1:8000/api`.

## Deploy note

On Render free tier, keep **FastAPI + static frontend** as the public demo. Run Mastra locally (or a second Render web service) for the partner write-up / Studio screenshots. Optional: add a `quoteflow-mastra` service later if credits allow.
