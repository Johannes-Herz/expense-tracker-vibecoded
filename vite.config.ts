import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Must match the GitHub repo name used for GitHub Pages.
const REPO_NAME = 'vibe-expense-tracker'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Dev server runs at "/", production build is served from /<repo>/ on GitHub Pages.
  const base = command === 'build' ? `/${REPO_NAME}/` : '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate', // new versions install silently in the background
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'ExpenseTracker',
          short_name: 'ExpenseTracker',
          description: 'Persönlicher Ausgaben-Tracker – alle Daten bleiben auf dem Gerät.',
          lang: 'de',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f8fafc',
          theme_color: '#4f46e5',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        // Precache the whole app so it opens offline after the first load.
        workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'], navigateFallback: 'index.html' },
        // Also run the service worker in `npm run dev` so offline behavior can be tried locally.
        devOptions: { enabled: false },
      }),
    ],
    // The whole app is precached for offline use anyway, so one bigger chunk is fine.
    build: { chunkSizeWarningLimit: 800 },
  }
})
