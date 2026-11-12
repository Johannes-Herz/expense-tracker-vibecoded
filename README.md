# ExpenseTracker

A personal expense tracker as an installable PWA (made for Android/Chrome). All data stays on your device in IndexedDB – no backend, no login. Works offline after the first load.

**Stack:** Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · Chart.js · vite-plugin-pwa

Full requirements: see [SPEC.md](SPEC.md).

## Run locally

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Open http://localhost:5173.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve the production build (service worker + offline mode work here) |
| `npm run lint` | Run the linter |

## Test on your phone (same Wi-Fi)

```powershell
npm run dev -- --host
```

Vite prints a `Network:` address like `http://192.168.x.x:5173`. Open it in Chrome on your phone.

- If the page doesn't load, Windows Firewall is probably blocking Node.js: allow it for **private networks** when Windows asks (or in *Windows Security → Firewall → Allow an app*).
- Phone and PC must be on the same Wi-Fi.
- Data saved this way lives in the browser for that address; it is separate from the installed GitHub Pages app.

**Installing to the home screen needs HTTPS.** Plain `http://192.168…` can't register a service worker, so "Install app" only appears on the deployed GitHub Pages site (see below). The local address is for trying out the UI.

## Deploy to GitHub Pages

The app is built for the repo name `vibe-expense-tracker` (`REPO_NAME` at the top of `vite.config.ts`). If your repo is named differently, change it there – the URL will be `https://<user>.github.io/<repo>/`.

**One-time setting on GitHub:**
1. Open the repo on GitHub → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

After that, every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes it. Watch progress in the repo's **Actions** tab. The workflow can also be started manually (*Run workflow*).

Typical flow: work on `dev` → merge into `main` → push `main`.

## Install on your Pixel

1. Open the GitHub Pages URL in Chrome.
2. Menu (⋮) → **Install app** (or *Add to Home screen*).
3. Open it once while online; afterwards it also opens offline.

New versions are downloaded in the background and activate the next time you fully close and reopen the app.

## Back up your data

Data is stored only on the device. Use **Settings → Sicherung (JSON) exportieren** regularly; clearing Chrome's site data or uninstalling the app deletes the database. Restore with **Sicherung importieren** (replace or merge).

## Project structure

```
src/
  db.ts                 Dexie schema, default categories, DB helpers
  lib/                  formatting (de-DE), date helpers, export/import, demo data, theme
  hooks/useData.ts      live queries (categories, month expenses, budget)
  components/           tab bar, month selector, expense list/form, dialogs, ...
  screens/              Expenses, Stats, Settings
  charts/               Doughnut, monthly bar, cumulative line
scripts/generate-icons.mjs   renders the PNG app icons into public/icons
```
