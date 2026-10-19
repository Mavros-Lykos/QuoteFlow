# Partner keys setup — SerpApi, ElevenLabs, Sentry, Tiger Data

**Bottom line:** for these four partners, you **do not need code changes**. The app already reads env vars and falls back safely when a key is missing. You only **sign up → copy secrets → paste into `backend/.env` (local) and Render Environment (hosted)**.

Estimated time: **45–90 minutes** for all four (most of that is waiting for signup emails / Tiger Cloud provisioning).

---

## Is this a big deal?

| Partner | Code change? | Difficulty | What you get when keyed |
|---------|--------------|------------|-------------------------|
| **SerpApi** | **No** | Easy | Live labor rates from search instead of the built-in index |
| **ElevenLabs** | **No** | Easy | Cloud voice → text + “Listen” TTS on estimates |
| **Sentry** | **No** | Easy | Agent step traces in Sentry dashboard |
| **Tiger Data** | **No** (env only; `asyncpg` already used in tool) | Medium | pgvector memory on Tiger Cloud + SQLite hybrid |

If `asyncpg` is missing from your install, one pip install is enough — still not an app rewrite:

```powershell
cd backend
python -m pip install asyncpg
```

Check `requirements.txt` includes `asyncpg`; if not, add that one line when you install (optional dependency for Tiger only).

---

## Where secrets go

### Local (your laptop)

1. Copy `backend\.env.example` → `backend\.env` (if you don’t have `.env` yet).
2. Paste keys into `backend\.env` (never commit this file — root `.gitignore` already ignores `.env`).
3. Restart: `python main.py`.

### Render (live demo for judges)

1. Render Dashboard → **quoteflow-backend** → **Environment**.
2. Add the same keys as secrets (see names below).
3. **Manual Deploy** / save so the service restarts.
4. Frontend does **not** need these keys — only the backend.

`render.yaml` already lists optional sync:false vars for SerpApi, ElevenLabs, Sentry, Tiger — you fill values in the dashboard.

---

## 1) SerpApi (live market rates)

### Sign up

1. Go to [https://serpapi.com](https://serpapi.com) → Sign up (free tier has limited searches/month).
2. Dashboard → **API Key** → copy.

### Configure

```env
SERPAPI_API_KEY=your_serpapi_key_here
```

### Verify

1. Restart backend.
2. Create an estimate (or call `GET /api/benchmarks?trade=Plumbing&zip_code=97401`).
3. In the estimate’s market / pricing notes, source should look like SerpApi (or search results) when the key works — not only the offline index.

### If it fails

- Wrong key → falls back to regional index (demo still works).
- Free quota exhausted → same fallback.

**Claim in post:** “Best Use of SerpApi” only after you see live benchmarks with the key set on the **hosted** backend.

---

## 2) ElevenLabs (voice STT + TTS)

### Sign up

1. Go to [https://elevenlabs.io](https://elevenlabs.io) → Sign up (free tier has character/minutes limits).
2. Profile / API → create **API key** → copy.

Hacktoberfest partners sometimes give credits at [hacktoberfest.com/my](https://hacktoberfest.com/my) — check for ElevenLabs if available.

### Configure

```env
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

### Verify

1. Restart backend.
2. In the app: **New estimate** → hold/use mic → speak a short job note → text should fill from cloud STT (if browser STT also runs, cloud may replace when upload succeeds).
3. Open an estimate → **Listen** / voice readout — should hit `/api/voice/readout` (needs key; otherwise browser speech fallback).

### If it fails

- No key → transcript empty from API; browser Web Speech may still work for typing.
- TTS without key → API returns 400; UI should fall back to browser speech.

**Claim in post:** only if mic/transcribe or Listen works against your **Render** backend with the key set.

---

## 3) Sentry (agent tracing)

### Sign up

1. Go to [https://sentry.io](https://sentry.io) → Create account / org.
2. Create a project: platform **Python** (or FastAPI if listed).
3. Copy the **DSN** (looks like `https://xxxx@o123.ingest.sentry.io/456`).

### Configure

```env
SENTRY_DSN=https://YOUR_PUBLIC_KEY@oXXXX.ingest.sentry.io/PROJECT_ID
# optional:
SENTRY_ENVIRONMENT=production
```

### Verify

1. Restart backend (startup calls `init_sentry()`).
2. Generate one estimate (spans wrap LLM / SerpApi / TabPFN / Tiger steps).
3. Open Sentry → **Performance** / **Issues** — you should see traces or events for `quoteflow` within a minute or two.

### If it fails

- Empty DSN → spans are no-ops; app still works.
- Need package: `pip install sentry-sdk` if not already in `requirements.txt`.

**Claim in post:** “Best Use of Sentry Agent Tracing” with a screenshot of a span timeline from generating a quote.

---

## 4) Tiger Data (pgvector hybrid memory)

### Sign up

1. Go to [Tiger Data / Timescale Cloud](https://www.tigerdata.com/) (or Timescale Cloud trial) → create a **free trial** Postgres service.
2. Copy the **connection string** (Postgres URI), typically:

```text
postgres://tsdbadmin:PASSWORD@HOST:5432/tsdb?sslmode=require
```

### Configure

```env
TIGER_DATA_CONNECTION_STRING=postgres://USER:PASS@HOST:5432/tsdb?sslmode=require
EMBEDDING_MODE=local
```

Leave `EMBEDDING_MODE=local` — free, no OpenAI key. Do **not** put the connection string in the frontend.

### One dependency check (not a feature rewrite)

```powershell
cd backend
python -m pip install asyncpg
python -c "import asyncpg; print('ok')"
```

If `asyncpg` is missing from `requirements.txt` on Render, add it there **or** install in the Render build (already covered if you add one line to requirements). That’s the only “codebase touch” you might need — dependency list, not QuoteFlow logic.

### Verify

1. Restart backend.
2. Generate **at least one** estimate (upserts into `quoteflow_jobs`).
3. Open: `http://127.0.0.1:8000/api/memory/status`  
   Expect something like `mode: tiger_hybrid_g3` (or similar hybrid status) when the connection works.
4. Generate a second similar job — memory search should pull prior jobs.

On Render: same env vars on **backend** only, then hit  
`https://YOUR-BACKEND.onrender.com/api/memory/status`.

### If it fails

- Empty connection string → SQLite keyword memory only (still works).
- Schema/SSL errors → check URI, `sslmode=require`, firewall, password special characters URL-encoded.
- Schema auto-creates `vector` extension + `quoteflow_jobs` on first use.

**Claim in post:** “Best Use of Tiger Data” with `/api/memory/status` screenshot + “quotes upserted to pgvector”.

---

## Paste-ready `backend/.env` block

```env
DEFAULT_MODEL_PROVIDER=groq
GROQ_API_KEY=gsk_...

SERPAPI_API_KEY=
ELEVENLABS_API_KEY=
SENTRY_DSN=
TIGER_DATA_CONNECTION_STRING=
EMBEDDING_MODE=local

QUOTEFLOW_SEED=0
```

Fill the four blanks after each signup. Keep `GROQ_API_KEY` — you still need it for estimates without Ollama.

---

## Render: add all four (checklist)

On **quoteflow-backend** → Environment:

| Key | Value |
|-----|--------|
| `GROQ_API_KEY` | (required for demo) |
| `SERPAPI_API_KEY` | from serpapi.com |
| `ELEVENLABS_API_KEY` | from elevenlabs.io |
| `SENTRY_DSN` | from sentry.io |
| `TIGER_DATA_CONNECTION_STRING` | Tiger Cloud Postgres URI |
| `EMBEDDING_MODE` | `local` |
| `DEFAULT_MODEL_PROVIDER` | `groq` |
| `QUOTEFLOW_SEED` | `0` |

Save → wait for deploy → smoke test:

1. `/api/health`
2. `/api/memory/status` (Tiger)
3. Create estimate (SerpApi + TabPFN + Tiger upsert + Sentry spans)
4. Mic + Listen (ElevenLabs)

---

## What to put in the DEV post (after verifying)

Safe featured/partner lines once keys are live on Render:

- **Gemma** — via Groq on demo  
- **Render** — hosting  
- **TabPFN** — totals calibration (optional: `PRIORLABS_TABPFN_API_KEY` for real Prior Labs API)  
- **SerpApi** — live ZIP/trade rates  
- **ElevenLabs** — voice STT/TTS  
- **Sentry** — agent step spans  
- **Tiger Data** — pgvector hybrid memory  

Show one screenshot per partner if you can (Sentry timeline, SerpApi source on quote, memory status, voice UI).

---

## What you do **not** need to change

- No new React pages  
- No orchestrator rewrite  
- No Tauri changes for these four  
- Frontend never gets these secrets  

Only: env vars (+ maybe `asyncpg` in requirements if Render pip doesn’t already install it for Tiger).
