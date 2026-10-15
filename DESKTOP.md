# QuoteFlow Desktop (Windows)

## What ships

- Tauri 2 shell under `frontend/src-tauri/`
- NSIS installer (`npm run tauri:build`)
- Local FastAPI + SQLite in `%APPDATA%\QuoteFlow` (`QUOTEFLOW_DATA_DIR`)
- First-run **Preparing** screen: start server → detect/pull Ollama `gemma3:4b` → or **Use online mode**
- Settings → About → **Check for updates** (opens Releases)

## Dev

```powershell
cd frontend
npm install
npm run tauri:dev
```

Requires: Rust (MSVC), WebView2, Python 3.10+ on PATH, backend deps installed.

## Sidecar (optional, fully offline backend)

```powershell
.\scripts\build-sidecar.ps1
# Then add to tauri.conf.json bundle.externalBin: ["binaries/quoteflow-api"]
cd frontend
npm run tauri:build
```

Without the sidecar, release builds still spawn `python main.py` when Python is available.

## Code signing

v1 may ship **unsigned**. Document SmartScreen “More info → Run anyway” on `/download`. When a cert is available, set Windows signing fields in `tauri.conf.json` / CI secrets.

## Env

| Variable | Purpose |
|----------|---------|
| `QUOTEFLOW_DATA_DIR` | SQLite + desktop settings folder |
| `QUOTEFLOW_SEED=0` | Skip demo seed quotes (desktop sets this) |
| `VITE_DOWNLOAD_URL` | Landing download button target |
| `VITE_API_BASE` | Hosted web demo API |
