# What is `VITE_DOWNLOAD_URL`?

It is the **link behind the “Download for Windows” button** on your website (`/download`).

- It is a **build-time** Vite variable (like `VITE_API_BASE`).
- It must point at the **Windows installer `.exe`** (or you can leave it empty and the site opens **GitHub Releases** instead).

Your repo: `https://github.com/Mavros-Lykos/QuoteFlow`

---

## Two ways to set it

### Option A — Direct `.exe` link (best UX)

After CI publishes a release asset:

```text
VITE_DOWNLOAD_URL=https://github.com/Mavros-Lykos/QuoteFlow/releases/download/v0.1.0/QuoteFlow_0.1.0_x64-setup.exe
```

Exact filename may differ slightly — **copy the link from the Release page** (“Download” / right‑click asset → Copy link).

### Option B — Don’t set it (works now)

Leave `VITE_DOWNLOAD_URL` empty. The site uses:

```text
https://github.com/Mavros-Lykos/QuoteFlow/releases/latest
```

Users pick the `.exe` from the Releases page.

Optional override:

```text
VITE_RELEASES_URL=https://github.com/Mavros-Lykos/QuoteFlow/releases/latest
```

---

## Build the installer with GitHub Actions

Workflow: `.github/workflows/desktop.yml`

### Step 1 — Push this repo (so Actions can run)

```powershell
cd d:\Projects\hacktoberfest26\week3SideHustle\quoteflow
git add -A
git commit -m "ci: publish Windows installer on version tags"
git push
```

### Step 2 — Create a version tag (this triggers the Release)

```powershell
git tag v0.1.0
git push origin v0.1.0
```

### Step 3 — Wait for the workflow

1. GitHub → **Actions** → **Desktop Windows** (green check).
2. GitHub → **Releases** → **QuoteFlow v0.1.0** with an `.exe` attached.

First Tauri build can take **10–20+ minutes**.

### Step 4 — Point the website at the installer (Render)

1. Open the release → right‑click the `.exe` → **Copy link address**.
2. Render → **quoteflow-frontend** → **Environment**:

| Key | Value |
|-----|--------|
| `VITE_DOWNLOAD_URL` | *(paste the .exe URL)* |
| `VITE_API_BASE` | `https://YOUR-BACKEND.onrender.com/api` |

3. **Manual Deploy** → Deploy latest commit (required — URL is baked into the JS at build time).

---

## Local only (no CI)

```powershell
cd frontend
npm run tauri:build
```

Installer appears under:

```text
frontend\src-tauri\target\release\bundle\nsis\
```

Upload that `.exe` to a GitHub Release manually, then set `VITE_DOWNLOAD_URL` the same way.

---

## Checklist

- [ ] Push code + workflow to GitHub  
- [ ] `git tag v0.1.0` && `git push origin v0.1.0`  
- [ ] Actions finished; Release has `.exe`  
- [ ] Copy asset URL → Render `VITE_DOWNLOAD_URL`  
- [ ] Redeploy frontend  
- [ ] Open site `/download` → button downloads the installer  

**Challenge note:** live **web demo** matters most for judges. The Windows installer is a strong bonus, not required to submit.
