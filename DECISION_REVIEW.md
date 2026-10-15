# QuoteFlow — Decision Review (locked)

| # | Topic | Decision | Status |
|---|--------|----------|--------|
| 1 | Model default | `gemma3:4b` | Shipped |
| 2 | Groq privacy | Redact PII | Shipped |
| 3 | Voice STT | ElevenLabs → browser Web Speech fallback | Shipped |
| 4 | Mastra | Agent + workflow sidecar | Shipped (`mastra/`) |
| 5 | **Backboard** | **Skip** (change of mind) | Skipped |
| 6 | **Temporal** | **Skip prize / Cloud** — free-tier only; local SQLite follow-ups remain for product UX | Deferred |
| 7 | **Tiger Data** | **G3 hybrid** — SQLite always + pgvector when `TIGER_DATA_CONNECTION_STRING` set | **Shipped** |
| 8 | Metric 3h→8m | Positioning claim OK | Shipped |
| 9 | Domain | Render free URL only (no .tech) | Locked |
| 10 | **v1 product** | **Windows desktop (Tauri) + public website** (landing + Try demo). No accounts. | **Locked** |
| 11 | **Mobile** | Capacitor / PWA / phone sync — **deferred** after desktop+web | Deferred |
| 12 | **Data location** | Desktop: `%APPDATA%/QuoteFlow` SQLite + device prefs. Web demo: hosted API; banner required. | Locked |
| 13 | **AI setup** | Desktop auto-prepares Ollama + `gemma3:4b`; Standard/online fallback if local fails | Locked |
| 14 | **Code signing** | Document unsigned SmartScreen warning until a cert is available | Locked |

---

## Tiger G3 — how to turn it on (free)

1. Create a free Tiger Cloud / Timescale trial service  
2. Copy the Postgres connection string into `backend/.env`:

```env
TIGER_DATA_CONNECTION_STRING=postgres://USER:PASS@HOST:5432/tsdb?sslmode=require
EMBEDDING_MODE=local
```

3. Restart FastAPI → schema `quoteflow_jobs` + `vector` extension auto-created  
4. Generate a quote → job is upserted with embedding  
5. Check `GET /api/memory/status` → should show `mode: tiger_hybrid_g3`

Without the connection string, SQLite keyword memory still works (demo never breaks).

---

## Partner chase (free-tier friendly)

| Partner | Status |
|---------|--------|
| Gemma | Live |
| TabPFN | Live (applied to totals) |
| SerpApi | Live path |
| ElevenLabs | Live + browser STT fallback |
| Mastra | Live sidecar |
| Tiger Data | **G3 hybrid** |
| Sentry | When DSN set |
| Render | Hosted demo |
| Backboard | Skipped |
| Temporal | Skipped (cost / ops) |
| .tech | Skipped |
