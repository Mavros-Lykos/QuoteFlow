const env = (import.meta as unknown as { env?: Record<string, string> }).env;

export const API_BASE: string = env?.VITE_API_BASE || 'http://localhost:8000/api';

/**
 * Direct link to the Windows installer (.exe), usually a GitHub Release asset.
 * Set at build time: VITE_DOWNLOAD_URL=https://github.com/.../releases/download/v0.1.0/QuoteFlow_0.1.0_x64-setup.exe
 */
export const DOWNLOAD_URL: string = env?.VITE_DOWNLOAD_URL || '';

/**
 * Fallback when no specific .exe URL is set — open the Releases page instead.
 * Example: https://github.com/YOUR_USER/quoteflow/releases/latest
 */
export const RELEASES_URL: string =
  env?.VITE_RELEASES_URL || 'https://github.com/Mavros-Lykos/QuoteFlow/releases/latest';

/** True when running inside the Tauri desktop shell (local-first build). */
export const isDesktop: boolean =
  typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = typeof body?.detail === 'string' ? body.detail : '';
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
