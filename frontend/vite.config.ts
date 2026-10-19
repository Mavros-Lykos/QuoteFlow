import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA is for the public website / browser install — not the Tauri desktop shell.
    ...(!isTauri
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons.svg'],
            manifest: {
              name: 'QuoteFlow',
              short_name: 'QuoteFlow',
              description:
                'Describe the job. Send the estimate. Built for plumbers, electricians, HVAC and remodelers.',
              theme_color: '#f5f3ee',
              background_color: '#f5f3ee',
              display: 'standalone',
              orientation: 'portrait-primary',
              scope: '/',
              start_url: '/app',
              categories: ['business', 'productivity'],
              icons: [
                {
                  src: '/favicon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any',
                },
                {
                  src: '/favicon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              navigateFallback: '/index.html',
            },
            devOptions: {
              enabled: true,
              type: 'module',
            },
          }),
        ]
      : []),
  ],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
