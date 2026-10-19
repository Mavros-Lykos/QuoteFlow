# QuoteFlow — full submission review & what’s left

**Challenge:** [HF26 Week 2 — Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)  
**Your DEV account:** [@mavroslykos](https://dev.to/mavroslykos) (DevRelay is connected — use it for drafts + agent session)  
**Deadline:** Oct 18, 2026 **11:59 PM PDT** (confirm on challenge page)

---

## Important: what “submission” actually is

| You might think… | Reality |
|------------------|---------|
| Upload zip to DEV | **No** |
| Submit only GitHub repo | **No** — repo supports the post |
| Fill a form on Hacktoberfest.com only | **No** — HF26 entry = **publish a DEV article** |
| One file upload | **Several assets**, all linked from **one DEV post** |

**The submission is one published DEV post** with tag **`#hf26challenge`**, using the challenge **submission template**, plus links/embeds to everything below.

---

## What you upload (and where)

| # | What | Where it lives | Who sees it |
|---|------|----------------|-------------|
| 1 | **Source code** | **GitHub** (or GitLab) public repo | Judges + community |
| 2 | **Running app** | **Render** (or similar) — frontend URL + API | Judges click “Try it” |
| 3 | **Screenshots / cover** | **Inside DEV post** (drag into editor → DEV hosts images) | Judges |
| 4 | **Demo video** (optional, strong) | YouTube (unlisted) or GIF in post | Judges |
| 5 | **The write-up** | **DEV article** (draft → publish) | Judges (weighted **most**) |
| 6 | **Agent session** (optional) | **DEV** via DevRelay → embed `{% agent_session … %}` in post | Judges (process) |
| 7 | **Windows installer** (optional for v1) | GitHub **Releases** `.exe` + `VITE_DOWNLOAD_URL` | Users; not required for challenge |

You do **not** upload the whole project to DEV. You **link** repo + demo and **paste** images into the post.

---

## What’s done vs what’s left (your repo today)

### Already in good shape

| Item | Status |
|------|--------|
| App (UI, welcome, estimates, PDF, PWA, settings) | Built |
| Partner integrations (Gemma, Groq, TabPFN, SerpApi, ElevenLabs, Mastra, Tiger, Sentry paths) | In codebase |
| `LICENSE` (MIT) | Added |
| `README.md`, `PRODUCTION_READY.md`, `DECISION_REVIEW.md` | Written |
| `render.yaml` for hosted demo | Ready to deploy |
| DevRelay MCP | You installed it |
| Challenge fit (Side Hustle + open-weight AI) | Strong |

### Still left before you submit (do in this order)

| # | Task | Why | How |
|---|------|-----|-----|
| **1** | **`.gitignore`** — ignore `__pycache__`, `quoteflow.db`, `.env` | Don’t leak DB or secrets | Add/update `.gitignore` |
| **2** | **Commit & push** to a **public** remote | Judges need a repo link | `git remote add origin …` → push `main` |
| **3** | **Deploy Render** | Judges need a live URL | Blueprint from `render.yaml`; set `GROQ_API_KEY`, `VITE_API_BASE` |
| **4** | **Smoke test live URL** | Avoid “demo broken” | One full estimate + PDF on production |
| **5** | **Capture media** | Post needs visuals | 4–6 screenshots + 60s screen recording |
| **6** | **Write DEV post** | **Main submission** | Template on challenge page + outline below |
| **7** | **Publish** with `#hf26challenge` | Official entry | From DEV editor (or publish draft DevRelay created) |
| **8** | **(Optional) DevRelay session** | Rubric bonus | Save session → embed in post → scrub secrets |

**Current gap:** no `git remote` configured yet; many changes **uncommitted**; **no** `docs/` screenshots; **no** live demo URL until Render is deployed.

---

## Deploy checklist (Render — ~30–45 min)

1. Push repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect repo → select `render.yaml`.
3. **Backend service** `quoteflow-backend`:
   - Add secret: `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com))
   - Optional: `SERPAPI_API_KEY`, `ELEVENLABS_API_KEY`, `SENTRY_DSN`
4. **Frontend service** `quoteflow-frontend`:
   - Environment: `VITE_API_BASE` = `https://<quoteflow-backend-host>.onrender.com/api`
   - Redeploy frontend after setting this (build-time variable).
5. Open `https://<quoteflow-frontend-host>.onrender.com` → `/app` → create one estimate.

**No Ollama on Render** — that’s fine. Hosted demo = **Groq + open-weight Gemma** (matches your laptop workflow).

Local dev without Ollama: `backend/.env` → `DEFAULT_MODEL_PROVIDER=groq` + `GROQ_API_KEY` (see `PRODUCTION_READY.md`).

---

## Screenshots to capture (upload into DEV post)

1. Landing page hero  
2. Welcome / region setup (e.g. India + GST)  
3. New estimate — mic / job notes  
4. Generated estimate — line items + total  
5. Send sheet or PDF  
6. (Optional) Settings → AI / privacy  

**Cover image:** use best hero or estimate screen (DEV cover ~ 1000×420).

---

## DEV post — required content (judging rubric)

Copy the **Side Hustle submission template** from the [challenge page](https://dev.to/challenges/hacktoberfest-week2-2026-10-12), then make sure you include:

1. **Title** — e.g. *QuoteFlow: voice-to-estimate for contractors (HF26 Side Hustle)*  
2. **Who would pay** — solo plumbers, electricians, HVAC; saves evening quoting time  
3. **What you built** — web demo + PWA + Windows desktop story  
4. **Why open innovation matters** — local Gemma on desktop (privacy); Groq Gemma for demo/weak PCs; not locked to one closed API  
5. **Demo** — **live URL** + 1–2 sentence test steps  
6. **Repo** — GitHub link  
7. **Stack & partners** — only what the **live demo** actually uses (Gemma, Render, Groq, TabPFN at minimum)  
8. **Bonus** — one person tried it / would they pay?  
9. **AI disclosure** — set in DEV editor (`some_ai` / `most_ai` — you used Cursor + AI to build)  
10. **Tag** — `#hf26challenge` (required)

Suggested extra tags (pick ≤4 total on DEV): `hacktoberfest`, `opensource`, `ai`, `webdev`.

---

## Using DevRelay (you already have it)

DevRelay does **not** replace publishing the post. It helps you **draft** and **show your process**.

### A. Draft the submission post (recommended)

Ask in Cursor:

> “Draft my HF26 Week 2 submission post for QuoteFlow to DEV as an unpublished draft.”

The agent should call **`create_article`** with:

- `published: false` (you review first)
- `tags` including whatever maps to **hf26challenge** on DEV (use `list_tags` or challenge tag name)
- `body_markdown` following the template above
- `ai_disclosure_level`: `some_ai` (default for agent-drafted posts)

You get an **`edit_url`** → open on DEV → add images → **Publish**.

### B. Save agent session (optional, +points)

1. Ask: *“Save this QuoteFlow build session to DEV via DevRelay.”*  
2. Agent uses **`submit_agent_session`** (scrub keys/paths).  
3. On DEV, open the session → **Make Public** if judges must view it.  
4. In the post, embed: `{% agent_session <id_or_slug> %}`

### C. After publish

- **`get_my_articles`** — confirm post is live and tagged  
- Completion badge usually follows a **valid** submission (per challenge FAQ)

---

## Full submission review (honest scores)

| Area | Rating | Notes |
|------|--------|-------|
| **Theme fit (Side Hustle)** | ⭐⭐⭐⭐⭐ | Real paid use case for trades; not a toy chatbot |
| **Open-weight / open AI story** | ⭐⭐⭐⭐ | Gemma 3 4B + Groq Gemma; explain clearly in post |
| **Technical execution** | ⭐⭐⭐⭐ | E2E works; hosted demo must be verified by you |
| **UX / product feel** | ⭐⭐⭐⭐⭐ | Onboarding, voice, one-screen flows — stand out |
| **Documentation** | ⭐⭐⭐⭐ | README + PRODUCTION_READY; need repo public |
| **Submission readiness** | ⭐⭐ | **Blockers:** no public repo push, no live URL, no DEV post yet |
| **Writing (for judges)** | ⭐ | **Not started** — this is the highest-weight criterion |

**Partner prize categories you can claim in the post** (if live demo uses them):

- Featured: **Gemma**, **Render**, **TabPFN**  
- Partner: **ElevenLabs**, **SerpApi**, **Mastra**, **Sentry**, **Tiger Data** (only if keys on Render)

**Do not claim:** Temporal, Backboard, .tech (skipped in `DECISION_REVIEW.md`).

---

## One-page “tonight” checklist

```
[ ] .gitignore — no .env, no quoteflow.db, no __pycache__
[ ] git commit + push to public GitHub
[ ] Render deploy + GROQ_API_KEY + VITE_API_BASE
[ ] Live smoke test (one estimate + PDF)
[ ] Screenshots + short video
[ ] DEV post drafted (DevRelay create_article OR write in editor)
[ ] Images + demo URL + repo URL in post
[ ] Tag #hf26challenge + AI disclosure
[ ] Publish before deadline
[ ] (Optional) DevRelay agent session embedded
```

---

## Related docs

| File | Purpose |
|------|---------|
| `DEV_CHALLENGE_SUBMISSION.md` | Challenge rules & post outline |
| `PRODUCTION_READY.md` | Deploy, Groq-only dev, PWA |
| `DECISION_REVIEW.md` | Partner honesty |
| `DESKTOP.md` | Windows installer (later) |

When the checklist is green, you’re submitted. The only public “entry” judges grade is the **DEV article** — everything else proves it works.
