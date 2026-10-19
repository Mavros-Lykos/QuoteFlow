# QuoteFlow — production readiness & follow-up

Use this as your **ship checklist**: what’s done, what to configure, how users install, how **you** test without a local LLM, and what’s still optional.

---

## What “production ready” means for v1

| Surface                                              | Role                             | Must work                                 |
| ---------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| **Website** (`/`, `/download`, `/privacy`, `/terms`) | Marketing + trust                | Responsive, clear CTAs                    |
| **Web app** (`/app/`*)                               | **Try demo** (Standard / Groq)   | Banner, PWA install, no fake customers    |
| **Windows desktop**                                  | Real product (local AI optional) | Preparing → Welcome → estimate → PDF/send |
| **Backend API**                                      | Quotes, PDF, voice, health       | Groq on hosted; Ollama optional locally   |

**Not in v1:** accounts, mobile stores, Mac/Linux desktop, customer share links, line-item PATCH editing.

---

## How end users install

### Option A — Browser (PWA)

Best for: quick try, phone/tablet browsing, judges, contractors who won’t install yet.

1. Open your hosted site (e.g. `https://quoteflow-frontend.onrender.com`).
2. Tap **Try it in your browser** → complete **Welcome**.
3. **Install (optional):** when the browser offers it, or use the in-app **Install** banner (Chrome/Edge Android/desktop). iOS: Safari → Share → **Add to Home Screen** (no `beforeinstallprompt`; banner may not show — that’s normal).
4. **Note:** PWA caches the **app shell**; **creating estimates still needs the API online** (Groq). Offline = view cached UI only, not full offline quoting.

### Option B — Windows desktop

Best for: data on PC, optional local Ollama.

1. Download installer from `/download` (set `VITE_DOWNLOAD_URL` to your GitHub Release `.exe`).
2. Run installer (unsigned builds: SmartScreen → More info → Run anyway).
3. First launch: **Preparing** → either local model setup **or** **Use online mode instead**.
4. Data: `%APPDATA%\QuoteFlow\` (SQLite + settings).

Build installer (maintainers):

```powershell
cd frontend
npm run tauri:build
# Artifact: frontend\src-tauri\target\release\bundle\nsis\*.exe
```

Optional bundled backend (no Python on user PC): `.\scripts\build-sidecar.ps1` then enable `externalBin` in `tauri.conf.json`.

---

## Your setup (no local Ollama / weak laptop)

You can validate **the same path as production users on Standard (cloud) mode**.

### 1. Backend — Groq only

```powershell
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
```

Edit `backend\.env`:

```env
DEFAULT_MODEL_PROVIDER=groq
GROQ_API_KEY=gsk_...   # free tier: console.groq.com
QUOTEFLOW_SEED=0       # no Marcus/Apex seed quotes
```

```powershell
python main.py
```

Check: `http://127.0.0.1:8000/api/health` → `groq_configured: true`, `ollama_connected` may be `false`.

### 2. Frontend — point at API

```powershell
cd frontend
copy .env.example .env.local
```

`.env.local`:

```env
VITE_API_BASE=http://127.0.0.1:8000/api
```

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173` → **Try demo** → Welcome → **New estimate** with sample job.  
Estimates use **Standard** (`groq-gemma2-9b`) automatically in the browser.

### 3. Desktop without local model

```powershell
cd frontend
npm run tauri:dev
```

On **Preparing**, click **Use online mode instead** (skips Ollama pull).  
Put `GROQ_API_KEY` in `backend\.env` so the spawned Python process can call Groq.

### 4. Hosted demo (Render)

1. Deploy from `render.yaml` (Blueprint).
2. Backend secret: `GROQ_API_KEY` (required).
3. Frontend build env: `VITE_API_BASE` = `https://<quoteflow-backend>.onrender.com/api`.
4. Optional: `VITE_DOWNLOAD_URL` = release installer URL.

`render.yaml` already sets `DEFAULT_MODEL_PROVIDER=groq` and `QUOTEFLOW_SEED=0` on the backend.

---

## Pre-launch checklist (you run this)

### Config & secrets

- [ ] `GROQ_API_KEY` set on hosted backend (and local `backend/.env` for dev)
- [ ] `VITE_API_BASE` correct on **production frontend build**
- [ ] `VITE_DOWNLOAD_URL` set when you have an installer artifact
- [ ] No real customer PII in web demo smoke tests

### Website

- [ ] `/` hero, how-it-works, system requirements, download + try CTAs
- [ ] `/privacy` and `/terms` readable
- [ ] `/download` shows SmartScreen note if unsigned

### Web app (`/app`)

- [ ] Welcome → Home → New estimate → Detail → Send sheet (copy / mailto / PDF)
- [ ] Demo banner visible; Settings → AI shows **web demo / Standard only**
- [ ] Seed quotes hidden (`q-101` style filtered in UI)
- [ ] PWA: `npm run build` && `npm run preview` — manifest + service worker register; install prompt or Add to Home Screen
- [ ] Region test: Welcome country **India** → GST 18%, totals formatted in INR in UI

### API / AI (Groq path — your laptop)

- [ ] `POST /api/quotes/generate` succeeds with a short plumbing prompt
- [ ] PDF download works (`/api/quotes/{id}/pdf`)
- [ ] Voice: mic works or falls back to typing (ElevenLabs optional)

### Desktop (if shipping installer)

- [ ] Preparing → online mode **or** Ollama path on a machine that has it
- [ ] Estimates persist under `%APPDATA%\QuoteFlow`
- [ ] Settings → Privacy → backup JSON + reset device
- [ ] `cargo check` / `npm run tauri:build` on Windows CI or local

### Security & ops

- [ ] `.env` never committed (only `.env.example`)
- [ ] CORS acceptable for your single frontend origin (tighten from `*` when you have a fixed domain)
- [ ] Optional: `SENTRY_DSN` for errors

---

## What we added for production (this pass)

- **PWA:** `vite-plugin-pwa` (web builds only; disabled for Tauri), install banner in `AppShell`
- **Render:** health check, `QUOTEFLOW_SEED=0`, frontend env vars documented
- **Env examples:** `frontend/.env.example`, `backend/.env.example` defaulting to **groq** for dev
- **Desktop spawn:** `DEFAULT_MODEL_PROVIDER=groq` when user chose online mode

---

## Remaining / nice-to-have (post-v1)

| Item                                     | Why                                   | Effort        |
| ---------------------------------------- | ------------------------------------- | ------------- |
| Code signing (Windows)                   | Remove SmartScreen friction           | Cert + CI     |
| PNG PWA icons 192/512                    | Better install UX on older Android    | Asset export  |
| Tighten CORS to your domain              | Security                              | Small         |
| `PATCH /quotes/{id}` line items          | Edit estimate after generate          | Medium        |
| Public share link `/q/:token`            | Customer accept flow                  | Medium        |
| Remove legacy seed DB on existing dev DB | Delete `backend/db/quoteflow.db` once | Trivial       |
| Tiger / SerpApi / ElevenLabs keys        | Partner demos                         | Optional keys |
| Mac/Linux desktop                        | Broader reach                         | Large         |
| True offline quote queue in PWA          | Field with no signal                  | Large         |

---

## Quick commands reference

| Task                 | Command                                             |
| -------------------- | --------------------------------------------------- |
| Web dev (Groq)       | `backend: python main.py` + `frontend: npm run dev` |
| Production web build | `cd frontend && npm run build`                      |
| Preview PWA locally  | `cd frontend && npm run preview`                    |
| Desktop dev          | `cd frontend && npm run tauri:dev`                  |
| Desktop installer    | `cd frontend && npm run tauri:build`                |
| API docs             | `http://127.0.0.1:8000/docs`                        |

---

## If something fails

| Symptom                        | Likely fix                                             |
| ------------------------------ | ------------------------------------------------------ |
| “Can’t reach QuoteFlow server” | Backend not running or wrong `VITE_API_BASE`           |
| Generate 500 / Groq error      | Missing or invalid `GROQ_API_KEY`                      |
| Empty / rule-based estimate    | Groq down and no Ollama — fix Groq key                 |
| Desktop Preparing stuck        | **Use online mode** + `GROQ_API_KEY` in `backend/.env` |
| PWA install not offered        | Use HTTPS (or localhost); Chrome; not inside Tauri     |
| SmartScreen blocks installer   | Expected until signed; use official download URL only  |

---

## Docs map

- **Product:** `PRODUCT.md`
- **Design:** `DESIGN.md`
- **Desktop build:** `DESKTOP.md`
- **Decisions:** `DECISION_REVIEW.md`
- **Deploy:** `render.yaml` + `README.md`

When this checklist is green on **Groq-only** dev and on **Render**, you’re in good shape to demo and tag a release.