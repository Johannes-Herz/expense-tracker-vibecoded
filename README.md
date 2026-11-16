# Expense Tracker

A personal expense tracker as an installable PWA (made for Android/Chrome). All data stays on your device in IndexedDB – no backend, no login. Works offline after the first load.

**Stack:** Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · Chart.js · vite-plugin-pwa

## Features

- Expenses **and income**, one-off or recurring (daily/weekly/monthly/yearly), each with their own editable categories.
- The home screen shows, for the selected month, income, expenses and what is **available** (income − expenses) with a progress bar. Every month starts fresh.
- Optional **monthly budget per expense category** (Planung → Budgets, or in the category editor), shown in the Stats tab (green / amber above 80 % / red when over).
- **Weekly budgets:** tick "Wöchentlich verfolgen" for a category with a monthly budget. The weekly budget is derived from it (monthly ÷ days in the month × days of the week in the month, ISO weeks Monday–Sunday, split weeks are divided by days, cents add up exactly). Leftover **and** overspending carry over to the following weeks of the month (a bulk shop covering two weeks is not "overspending"); every month starts at 0. The home list is grouped by week; each week divider shows ▼ (kept) / ▲ (over) / ● (still open) per tracked category, tap for details. The Stats tab (Kategorien) has a matching week-by-week grid.
- Stats: income, expenses, balance, savings rate, income vs. expenses for 12 months, category and spending charts (expenses only), total balance.
- CSV export (with a type column) and JSON backup (older backups still import).
- **Planned recurring payments:** for the current and the next month, recurring expenses and income that are due but not booked yet are shown as *planned* (home screen, list, Stats, category budgets, charts). The forecast is the main number, booked-only values are shown next to it. Planned entries are calculated on the fly, never stored, and are not part of exports.
- **Kategorie-Trends** (Stats tab): per expense category, is spending rising, falling or stable compared to the average of the last 3/6/12 months? Sparkline, badge (▲ / ▼ / ● stabil) and a 12-month detail chart per category. The running month is shown as the share of a usual month used so far ("● 50 % vom Ø") and turns red only once it is already above a usual month; the stability threshold is adjustable in Settings.
- **Four tabs:** Übersicht, Statistik, **Planung** (recurring payments and budgets) and Einstellungen (appearance/language, categories, data & backup). Settings has sub-pages; the **Android back gesture** closes open forms/sheets/dialogs first, then goes up from a sub-page, and only then leaves the app. Risky actions (replace import, delete all) sit behind a confirmation and an "Erweitert" section.
- **Stats tab in three groups** (switch at the top, last group remembered): Übersicht (key numbers, planned entries, spending course, biggest expenses), Kategorien (budgets, trends, split by category), Verlauf (12-month income vs. expenses, total balance). The selected month applies to all groups.
- **Native Android app** (Capacitor): same app as an APK with automatic backups to `Documents/ExpenseTracker`, see [Android app](#android-app-capacitor).
- **German / English** UI, switchable in Settings (numbers and dates stay in German format).

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
| `npm test` | Run the unit tests |

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

The app is built for the repo name `expense-tracker-vibecoded` (`REPO_NAME` at the top of `vite.config.ts`). If your repo is named differently, change it there – the URL will be `https://<user>.github.io/<repo>/` (for this repo: https://johannes-herz.github.io/expense-tracker-vibecoded/).

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

## Android app (Capacitor)

Besides the PWA there is a native Android app built from the same code with [Capacitor](https://capacitorjs.com). App id `de.johannes.expensetracker` (**never change it**: a different id is a different app with empty data). The PWA/GitHub Pages build is unaffected.

**What differs from the PWA:** no service worker or install prompt; the Android back button/gesture works like in the PWA (closes forms, goes up, exits on the home screen); status/navigation bar icons follow the app theme; CSV/JSON export opens the **share sheet** (save to Files, Drive, mail …) instead of a browser download; **automatic backups** to `Documents/ExpenseTracker` (see below). The data of the native app is **separate from the PWA in Chrome**: it starts empty.

### One-time setup on Windows

1. **JDK 21** (e.g. Temurin) with `JAVA_HOME` set.
2. **Android SDK** (comes with Android Studio): platform 36 and build-tools 36. Set the user environment variable `ANDROID_HOME` to the SDK folder (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`) and add `%ANDROID_HOME%\platform-tools` to `PATH` (for `adb`). Open a new terminal afterwards. Android Studio itself is optional (2025.2.1 or newer if you use it). The first Gradle build downloads dependencies and takes a few minutes.
3. **Pixel:** Settings → About phone → tap *Build number* 7 times → Developer options → *USB debugging* (only needed for `adb`; copying the APK works without).

### Build and install a debug APK

| Command | What it does |
| --- | --- |
| `npm run build:android` | Web build for the app (relative base path, no PWA) into `dist-android/` |
| `npm run android:sync` | `build:android` + copy into the Android project |
| `npm run android:debug` | Sync + build `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:install` | Install the debug APK on the connected phone (`adb install -r`) |
| `npm run android:release` | Sync + build `android/app/build/outputs/apk/release/app-release.apk` (needs the keystore, see below) |
| `npm run android:install:release` | Install the release APK on the connected phone |
| `npm run android:assets` | Re-generate icon and splash screen from `scripts/generate-android-assets.mjs` |

The **debug** app installs as "Expense Tracker Debug" (`…expensetracker.debug`) with its own data, next to the real app. To install without a cable, copy the APK to the phone (USB file transfer, Drive, …), open it in Files and allow "Install unknown apps" for that app once.

### Release APK and signing keystore

Android only installs an update over an existing app if both APKs are signed with **the same key**. Debug APKs use a throw-away debug key, so use the **release** APK (your own key) for the app you really use.

1. Create the keystore once, **outside the repository** (PowerShell; `keytool` lives in `%JAVA_HOME%\bin`):
   ```powershell
   keytool -genkeypair -v -keystore C:\Users\<you>\keystore\expense-tracker.jks -alias expense-tracker -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in path and passwords (alternatively set the environment variables `ET_KEYSTORE_FILE`, `ET_KEYSTORE_PASSWORD`, `ET_KEY_ALIAS`, `ET_KEY_PASSWORD`). `keystore.properties`, `*.jks` and `*.keystore` are in `.gitignore` and must **never** be committed.
3. `npm run android:release`, then `npm run android:install:release` (or copy `app-release.apk` to the phone).
4. For every new version raise `versionCode` (and `versionName`) in `android/app/build.gradle`; an update must have a higher `versionCode`.

> ⚠️ **Back up the keystore file and both passwords** (password manager, USB stick, cloud storage of your choice). **Without them you can never install an update over the existing app** – you would have to uninstall it, which deletes its data (restore from a backup file then).

*Optional idea:* a GitHub Actions workflow could build the APK (`npm ci`, `npm run android:debug` with Node 22 and JDK 21). Signing there would need the keystore stored as repository secrets, which is not set up here.

### Automatic backups (Documents/ExpenseTracker)

- After every change to your data (entries, income, categories, recurring payments, budgets, settings) the app writes a backup **about 5 seconds after the last change**, and immediately when the app goes to the background. Same format as the JSON export, so any backup can be restored with the normal import.
- Files are named `expense-tracker-backup-2026-11-16_22-48.json`. Only the **newest 3** are kept. Nothing is written if the data did not change.
- **Einstellungen → Daten & Backup** shows the folder, the time of the last successful backup, a **"Backup jetzt erstellen"** button and a red warning if writing failed.
- **Restore:** *Aus Backup wiederherstellen* opens the system file picker (choose a file from `Documents/ExpenseTracker` or anywhere else), then *Zusammenführen* or *Alle Daten ersetzen*.
- **After uninstalling and reinstalling:** the backup files stay in the folder, but Android treats the new install as a different owner (Android 11+): it can no longer **see or delete** the old files. So restoring always uses the file picker (works for every file), and the "keep 3" cleanup only counts files this install created. Older files can be deleted in the Files app.
- **Moving your PWA data:** in the PWA export a JSON backup (Daten & Backup), get the file onto the phone, and on the first start of the native app choose *Aus Backup wiederherstellen* (or later in Daten & Backup).

## Back up your data

Data is stored only on the device. Use **Einstellungen → Daten & Backup → Sicherung (JSON) exportieren** regularly; clearing Chrome's site data or uninstalling the app deletes the database. Restore with **Sicherung importieren** (replace or merge). The native Android app also backs up automatically, see above.

## Project structure

```
src/
  db.ts                 Dexie schema (v4), default categories, DB helpers
  lib/                  formatting (de-DE), dates, recurrence, finance calculations, ISO weeks and weekly budgets, export/import, automatic backup (autoBackup.ts, backupStorage.ts), demo data, theme
  hooks/useData.ts      live queries (categories, month entries)
  components/           tab bar, month selector, expense list/form, dialogs, ...
  screens/              Expenses, Stats, Planning, Settings (+ settings/ sub-pages)
  charts/               Doughnut, monthly bar, cumulative line, income vs. expenses
android/                     Capacitor Android project (committed; keystore and local SDK path are gitignored)
capacitor.config.ts          app id / name for the native app
scripts/generate-icons.mjs   renders the PNG app icons into public/icons
scripts/generate-android-assets.mjs   source images for the Android icon/splash
scripts/gradle.mjs           runs the Gradle wrapper (used by the android:* scripts)
```
