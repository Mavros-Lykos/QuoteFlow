import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { API_BASE, DOWNLOAD_URL, isDesktop } from './platform';

export interface AiStatus {
  ollama_on_path: boolean;
  api_reachable: boolean;
  has_gemma3_4b: boolean;
}

export interface PullProgress {
  message: string;
  percent?: number | null;
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isDesktop) return null;
  try {
    return await invoke<T>(cmd, args);
  } catch {
    return null;
  }
}

export async function getDataDir(): Promise<string | null> {
  return tauriInvoke<string>('get_data_dir');
}

export async function getAiStatus(): Promise<AiStatus | null> {
  return tauriInvoke<AiStatus>('ai_status');
}

export async function ensureAi(): Promise<{ ok: boolean; error?: string }> {
  if (!isDesktop) return { ok: true };
  try {
    await invoke('ensure_ai');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getUseOnlineMode(): Promise<boolean> {
  const v = await tauriInvoke<boolean>('get_use_online_mode');
  return v ?? false;
}

export async function setUseOnlineMode(enabled: boolean): Promise<void> {
  if (!isDesktop) return;
  try {
    await invoke('set_use_online_mode', { enabled });
  } catch {
    /* ignore */
  }
}

export async function openReleases(): Promise<void> {
  if (!isDesktop) {
    const url = DOWNLOAD_URL || 'https://github.com/hacktoberfest26/quoteflow/releases';
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await invoke('open_releases', { url: DOWNLOAD_URL || null });
  } catch {
    /* ignore */
  }
}

export function onAiPullProgress(handler: (p: PullProgress) => void): Promise<UnlistenFn> {
  if (!isDesktop) return Promise.resolve(() => {});
  return listen<PullProgress>('ai-pull-progress', (ev) => handler(ev.payload));
}

export async function waitForBackend(maxMs = 120_000, intervalMs = 800): Promise<boolean> {
  const healthUrl = `${API_BASE}/health`;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(4_000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export async function closeDesktopApp(): Promise<void> {
  if (!isDesktop) return;
  try {
    await getCurrentWindow().close();
  } catch {
    /* ignore */
  }
}

export const OLLAMA_INSTALL_URL = 'https://ollama.com/download';
