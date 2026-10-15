# QuoteFlow Design

## Platform (v1)

- **Product:** Windows desktop (Tauri 2)
- **Website:** Landing, Download, Privacy, Terms, and a browser **Try demo**
- **Deferred:** Capacitor mobile, Mac/Linux, cloud accounts

## Brand

- **Name:** QuoteFlow (hero-level on marketing; mark `Q` in-app)
- **Voice:** Plain trade language. No model jargon in the hero.
- **Tagline:** Describe the job. Send the estimate.

## Tokens

| Token | Light | Notes |
|-------|-------|-------|
| `--bg` | `#f5f3ee` | Warm paper |
| `--ink` | `#17202a` | Body text |
| `--brand` | `#d9480f` | Safety orange CTAs |
| `--font-ui` | Inter | UI copy |
| `--font-display` | Bricolage Grotesque | Headlines |

Dark theme via `data-theme="dark"` on `<html>`.

## Layout rules

1. **One screen, one job** — welcome steps, estimate wizard, settings sub-pages.
2. **Desktop shell** — left sidebar (≥1024), icon rail (720–1023), bottom nav + mic FAB (&lt;720).
3. **No fake sample customers** in empty states; seed quotes filtered from the UI.
4. **Web demo banner** — always clear that desktop is the full product.

## Key flows

1. Desktop: Preparing AI → Welcome → Home → New estimate → Detail → Send
2. Web: Landing → Try demo (Standard) → same app routes with banner
