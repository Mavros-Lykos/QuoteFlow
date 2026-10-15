# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users: Independent solo trade contractors, owner-operators, and residential service professionals (plumbers, electricians, HVAC technicians, carpenters/remodelers, painters, and general handymen). 

Their situation: They work 8–10 hours physically on jobsites and in their service trucks. At the end of a long day, they face an unpaid "second shift"—spending 2.5 to 3.5 hours hunched over paper notes, supplier price sheets, and spreadsheets drafting estimates and customer proposals. 

Their job: Produce fast, accurate, itemized quotes before competitors do, protect their profit margins, and maintain professional customer communication without sacrificing their evenings and family time.

## Product Purpose

QuoteFlow AI transforms the contractor's estimating ordeal from a 3-hour late-night spreadsheet struggle into an **8-minute jobsite workflow**. By speaking or typing informal job notes directly from the truck or driveway, contractors instantly receive a comprehensive, itemized Bill of Materials (BOM), labor schedule, regional rate validation, and a high-converting customer proposal letter.

Success means:
1. Returning quotes to customers within minutes of leaving the jobsite (winning more high-margin bids).
2. Saving 40+ hours per month of unpaid administrative paperwork.
3. Guaranteeing 100% data privacy for client residential addresses, security notes, and proprietary margins through local air-gapped open models.

## Positioning

QuoteFlow AI is the first **local-first, privacy-guaranteed estimating engine for tradespeople**. 

Unlike generic cloud AI chatbots (ChatGPT/Claude) that require uploading sensitive homeowner addresses and proprietary profit margins to corporate cloud servers, QuoteFlow runs directly on the contractor's laptop or mobile browser using open-weight models (Google Gemma, Llama, Qwen).

Unlike cumbersome enterprise contractor software (ServiceTitan, Jobber) that costs $200–$400/month and requires complex back-office setup, QuoteFlow is lightweight, zero-overhead, and specifically built for solo and small-crew operators.

## Operating Context

- **Environment**: Often used inside a contractor's service truck, on a jobsite driveway, or at home on a standard budget laptop or tablet.
- **Hardware Realities**: Contractors often use older or standard laptops (4GB–8GB RAM) or mobile devices, not $3,000 developer machines. QuoteFlow features a built-in hardware benchmarker that tailors model selection (`gemma3:1b` Lite, **`gemma3:4b` Standard default**, `gemma2:9b` / Qwen Power, and Groq cloud for mobile / hosted demos).
- **Rituals**: Quoting is time-critical. Industry data demonstrates that the first contractor to deliver a professional itemized estimate wins the deal 68% of the time.

## Capabilities and Constraints

- **Multi-Model Local Inference**: Unified Ollama adapter supporting Gemma 3 (4B / 1B), Gemma 2 9B, Llama 3.1, Qwen 2.5, with cloud Groq fallback (PII-redacted) for zero-install / Render demos.
- **Itemized Bill of Materials (BOM)**: Automatic categorization of line items into Materials, Labor, Equipment, and Municipal Permits.
- **Prior Labs TabPFN-3.5 Pricing Calibration**: Embeds tabular foundation model predictions to balance competitive win-rates against target gross margins.
- **SerpApi Regional Rate Grounding**: Validates contractor labor and material rates against live zip-code-specific market indices.
- **Temporal Durable Follow-Ups**: Schedules automated 72-hour customer check-ins and 7-day expiration reminders that survive server reboots.
- **ElevenLabs Truck Voice Mode**: Audio transcription of spoken site notes and hands-free natural voice readout of drafted proposals.
- **Tiger Data Memory**: Semantic vector search across the contractor's historical winning quotes to maintain consistent pricing.
- **Constraint**: Must function reliably without requiring costly cloud GPU subscriptions or Docker.

## Brand Commitments

- **Name**: QuoteFlow AI
- **Tagline**: Local AI Estimating & Proposal Engine for Independent Contractors. "3 hours → 8 minutes."
- **Visual Tone**: Contractor Industrial meets High-Tech Precision. Deep slate/zinc dark mode, high-contrast amber/gold electric accents, clean typography (*Plus Jakarta Sans* and *Outfit*), with glassmorphism and clear visual hierarchy.

## Evidence on Hand

- Fully operational React + TypeScript frontend running on `http://127.0.0.1:5173`.
- Fully operational FastAPI + SQLite backend running on `http://127.0.0.1:8000`.
- Verified live end-to-end browser walkthrough (`quoteflow_walkthrough.webp`).
- Pre-seeded realistic contractor database containing active Plumbing, Electrical, and Remodeling proposals.

## Product Principles

1. **Air-Gapped Privacy First**: Client personal addresses, gate codes, and trade profit margins belong strictly to the contractor—never leaked to public LLM training datasets.
2. **Speed to Bid Wins**: An estimate generated in the driveway within 8 minutes closes deals before competitors can even open a spreadsheet.
3. **Hardware Realism**: Never assume the contractor owns a high-end gaming GPU; adapt seamlessly to budget laptops, mobile browsers, or lightweight local models.
4. **Professional Polish**: Every quote output must look like it was prepared by a top-tier commercial firm, instantly instilling customer trust.

## Accessibility & Inclusion

- High-contrast color ratios meeting WCAG AA standards.
- Large, touch-friendly tap targets suitable for outdoor tablet and mobile use.
- Dual input modalities: full voice-dictation truck mode paired with standard keyboard input.
- Clear audible confirmation through voice proposal readout.
