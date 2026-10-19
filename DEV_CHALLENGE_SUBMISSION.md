# Submitting QuoteFlow to the DEV Challenge (HF26)

**Your build fits:** [Hacktoberfest Open-Source AI Challenge: Week 2 — Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)  
**Theme:** Something with open-weight / open-source AI that someone would **actually pay for** (contractors paying for faster, professional estimates).

**Deadline (Week 2):** **October 18, 2026, 11:59 PM PDT** (check the [challenge page](https://dev.to/challenges/hacktoberfest-week2-2026-10-12) for the official clock).  
If Week 2 is closed, use the **current** HF26 week on [dev.to/challenges/hf26](https://dev.to/challenges/hf26) — rules are similar; tag is still **`#hf26challenge`**.

---

## How submission works (not a GitHub form)

1. You **publish a DEV post** (article), using the **Side Hustle submission template** on the challenge page.
2. Include the required tag: **`#hf26challenge`**
3. **One entry per person** per challenge week.
4. Project should be **started and built during that challenge window** (commits after the deadline should be noted in README).
5. **English** post if you want to be prize-eligible.
6. Set **`ai_disclosure_level`** honestly on the post (you used AI to build — typically `some_ai` or `most_ai` per [DEV AI guidelines](https://dev.to/devteam/ai-content-policy)).

Optional: embed or link a **DevRelay agent session** transcript so judges see your process.

---

## Before you hit Publish — checklist

### Must-have for judges

| Item | Status for QuoteFlow | Action |
|------|----------------------|--------|
| Public **repo** link | Your GitHub / Origin URL | Push repo; link in post |
| **Live demo** URL | Render or similar | Deploy frontend + backend; link in post |
| **#hf26challenge** tag | — | Add in DEV editor |
| **Who would pay** | Solo plumbers, electricians, HVAC, remodelers | 2–3 sentences in post |
| **Why open innovation matters** | Local Gemma via Ollama; Groq open-weight fallback; data on device | Dedicated section (see outline below) |
| **Demo** | Screenshot / GIF / embed | Record: welcome → voice or sample job → estimate → PDF/send |
| **LICENSE** | MIT (`LICENSE`) | Done in repo |
| **README** | Quickstart + demo vs desktop | Already in `README.md` |

### Strongly recommended (rubric + bonus)

| Item | Why |
|------|-----|
| **First user / feedback** | Week 2 bonus: “land your first user” — even one friend who tried it and said what they’d pay |
| **Architecture diagram** | 1 image: React → FastAPI → Ollama/Groq + SQLite |
| **Partner honesty** | Only claim categories you **actually use** in the demo |
| **No secrets in post** | No API keys; use Render secrets |

### Deploy for judges (minimum)

1. Render blueprint: `render.yaml`
2. Backend secret: **`GROQ_API_KEY`** (you can demo without Ollama on Render)
3. Frontend build env: **`VITE_API_BASE`** = `https://<your-backend>.onrender.com/api`
4. Smoke test: create one estimate on the **live** URL before publishing

Details: `PRODUCTION_READY.md`

---

## Prize categories QuoteFlow can enter (be honest)

**Featured ($200 each)** — strong fits if demo works:

| Category | How QuoteFlow uses it |
|----------|------------------------|
| **Best Use of Gemma** | Default `gemma3:4b` (Ollama desktop); Groq Gemma on web demo |
| **Best Use of Render** | `render.yaml` hosted API + static frontend |
| **Best Use of TabPFN** | TabPFN calibration applied to quote totals |

**Partner ($100 each)** — mention only if enabled in your deployed demo:

| Category | In codebase |
|----------|-------------|
| ElevenLabs | Voice transcribe/TTS when keyed |
| SerpApi | ZIP/trade labor benchmarks |
| Mastra | `mastra/` sidecar |
| Sentry | Agent spans when `SENTRY_DSN` set |
| Tiger Data | G3 hybrid when connection string set |

**Do not claim** unless you turn them on: Temporal (deferred), Backboard (skipped), .tech (skipped).

---

## Suggested DEV post outline (writing quality = top criterion)

Use the official template on the challenge page, but cover these sections:

1. **Hook** — “Contractors lose jobs when the quote lands late. QuoteFlow turns a voice note in the truck into a sendable estimate in minutes.”
2. **Who pays** — Owner-operators / small trade businesses; cheaper than ServiceTitan; saves unpaid evening hours.
3. **What you built** — Website + PWA try demo + Windows desktop (local data). Screenshots or short video.
4. **Why open innovation matters** — Customer addresses and margins stay on the laptop with Ollama; Groq uses **open-weight** Gemma with PII redaction for weak PCs / hosted demo; no lock-in to one closed API for the core product story.
5. **Demo** — Live link + steps: “Try sample plumbing job → Send PDF.”
6. **Stack** — React, FastAPI, SQLite, Gemma 3 4B, TabPFN, optional SerpApi/ElevenLabs.
7. **First user** (bonus) — Who tried it, what they said, would they pay $X/month?
8. **What’s next** — Installer on `/download`, mobile later.
9. **Links** — Repo, demo, `DECISION_REVIEW.md` for partner honesty.

Tags: `#hf26challenge` `#hacktoberfest` `#opensource` `#ai` `#sidehustle` (optional extras).

---

## Step-by-step: submit today

1. **Deploy** live demo (Render + `GROQ_API_KEY`).
2. **Push** repo with `LICENSE`, README, screenshots in `docs/` or post body.
3. **Record** 60–90s screen capture (or GIF) of the happy path.
4. Open [Week 2 challenge](https://dev.to/challenges/hacktoberfest-week2-2026-10-12) → copy **submission template**.
5. **Write** the post (draft on DEV; disclose AI assistance).
6. **Publish** before the deadline with **`#hf26challenge`**.
7. Optional: save/embed agent session via DevRelay.

---

## After publish

- Completion badge on DEV profile (valid submissions).
- Winners announced the week after close on DEV.
- Engage on the launch post comments if judges ask for test steps.

---

## If Week 2 is already closed

- Enter **Week 3+** on [HF26 hub](https://dev.to/challenges/hf26) when the theme fits (still one fresh entry per week).
- Your QuoteFlow story still works as a **side hustle / open AI** project; adjust the “theme” paragraph to that week’s prompt.
