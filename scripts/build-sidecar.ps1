# Optional: bundle the FastAPI backend as a Tauri sidecar for offline Windows installs.
# Requires: Python 3.10+, pip install pyinstaller, backend deps installed.
#
# Output: frontend/src-tauri/binaries/quoteflow-api-x86_64-pc-windows-msvc.exe
# Then: cd frontend && npm run tauri:build

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"
$OutDir = Join-Path $Root "frontend\src-tauri\binaries"
$Dist = Join-Path $Root "build\pyinstaller"

New-Item -ItemType Directory -Force -Path $OutDir, $Dist | Out-Null

Push-Location $Backend
try {
  python -m pip install pyinstaller -q
  python -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --name quoteflow-api `
    --distpath $Dist `
    --workpath (Join-Path $Root "build\pyinstaller-work") `
    --specpath (Join-Path $Root "build\pyinstaller-spec") `
    --hidden-import=uvicorn.logging `
    --hidden-import=uvicorn.loops `
    --hidden-import=uvicorn.loops.auto `
    --hidden-import=uvicorn.protocols `
    --hidden-import=uvicorn.protocols.http `
    --hidden-import=uvicorn.protocols.http.auto `
    --hidden-import=uvicorn.lifespan `
    --hidden-import=uvicorn.lifespan.on `
    main.py

  $Built = Join-Path $Dist "quoteflow-api.exe"
  if (-not (Test-Path $Built)) {
    throw "PyInstaller did not produce $Built"
  }

  $Target = Join-Path $OutDir "quoteflow-api-x86_64-pc-windows-msvc.exe"
  Copy-Item -Force $Built $Target
  Write-Host "Sidecar ready: $Target"
}
finally {
  Pop-Location
}
