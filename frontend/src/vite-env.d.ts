/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DOWNLOAD_URL?: string;
  readonly VITE_RELEASES_URL?: string;
  /** Set by Tauri CLI during `tauri build` / `tauri dev` (e.g. `windows`). */
  readonly TAURI_ENV_PLATFORM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
