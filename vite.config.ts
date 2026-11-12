import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Must match the GitHub repo name used for GitHub Pages.
const REPO_NAME = 'vibe-expense-tracker'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Dev server runs at "/", production build is served from /<repo>/ on GitHub Pages.
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [react(), tailwindcss()],
  // The whole app is precached for offline use anyway, so one bigger chunk is fine.
  build: { chunkSizeWarningLimit: 800 },
}))
