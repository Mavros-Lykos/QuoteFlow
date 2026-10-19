import { registerSW } from 'virtual:pwa-register';

/** Register service worker on web builds only (vite-plugin-pwa). */
export function registerPwa(): void {
  if (import.meta.env.DEV) {
    // devOptions.enabled still benefits from registration for install prompt testing
  }
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[QuoteFlow] App shell cached for offline use.');
    },
    onRegisteredSW(_url, registration) {
      if (registration) {
        window.setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });
}
