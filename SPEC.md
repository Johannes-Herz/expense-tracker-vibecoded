I want to build a personal expense tracker as an installable PWA for my Google Pixel (Android, Chrome). I'm vibe coding this, so please make sensible technical decisions, explain briefly what you did, and keep the code simple and readable.

First, make a plan. Once I approve the plan, start by saving this entire message as SPEC.md in the project folder so we can refer back to it later. Then build the app step by step.

## Project setup
- Create a new Vite project directly in the current folder (not in a subfolder): React + TypeScript. The folder already contains a .git folder; keep it and don't let the Vite setup delete or overwrite it.
- Styling: Tailwind CSS.
- Storage: IndexedDB via Dexie.js. All data stays on the device: no backend, no login.
- Charts: Chart.js with react-chartjs-2.
- PWA: vite-plugin-pwa (manifest, service worker, offline support, app icon).
- App display name: "ExpenseTracker".
- I'm on Windows, using PowerShell.

## Git rules
- A git repository already exists in this folder and the remote "origin" is already set up. Do not run git init and do not change the remote.
- Create a branch called "dev" and do all work on it. Never touch the "main" branch.
- Add a sensible .gitignore.
- Commit locally after each working step with a clear commit message.
- Never push, never pull, never create repositories, and never change any remote settings. I will handle merging and pushing myself.

## Deployment
- The app will be hosted on GitHub Pages from the repo "vibe-expense-tracker". Configure the Vite base path for that.
- Add a GitHub Actions workflow file (.github/workflows/deploy.yml) that builds the app and deploys it to GitHub Pages whenever I push to "main". Don't push or deploy anything yourself.
- In the README, tell me which one-time setting I need to change on GitHub to enable Pages with GitHub Actions.

## Data model
An expense has:
- id
- amount in EUR, stored in cents to avoid rounding errors
- category (from the category list)
- date (default: today)
- note (optional, short text)
- createdAt

Default categories, editable in settings: Groceries, Eating out, Transport, Housing, Shopping, Health, Leisure, Subscriptions, Travel, Other. Each category has a name, a color and an emoji.

## Screens
Bottom tab navigation with 3 tabs:

### 1. Expenses (home)
- Big floating "+" button to add an expense.
- Add/edit form: amount input with numeric keyboard, category picker as a grid of emoji buttons, date picker, optional note. Adding must be fast: open → type amount → tap category → save.
- List of expenses grouped by day, newest first, with day totals.
- Tap an expense to edit it, including a delete option with confirmation.
- Month selector at the top (previous/next month) showing the month total.
- If a monthly budget is set, show a progress bar for it.

### 2. Stats
- Summary cards: total this month, average per day, number of expenses, change versus last month in %.
- Doughnut chart: spending by category for the selected month.
- Bar chart: monthly totals for the last 12 months.
- Line chart: cumulative spending in the current month versus the previous month.
- List of the 5 biggest expenses of the month.

### 3. Settings
- Manage categories: add, rename, change emoji/color, delete if unused.
- Optional monthly budget.
- Export all data as CSV and as a JSON backup.
- Import a JSON backup, asking whether to replace or merge existing data.
- Light/dark mode toggle (default: follow system).
- "Load demo data" button that adds realistic sample expenses from the last 12 months, plus a "Delete all data" button with a strong confirmation.

## Design
- Mobile-first, optimized for a ~412px wide screen, but usable on desktop.
- Clean and modern: rounded cards, good contrast, large touch targets, smooth but subtle transitions.
- Format numbers and dates in German locale (e.g. 12,50 € and 12.11.2026).
- Works fully offline after the first load.

## How to work
1. Plan first: file structure, components, and build steps.
2. Build in this order: setup → data layer → expense list and form → stats → settings → PWA → deployment config.
3. After each step, make sure `npm run build` passes without errors, then commit.
4. When the first usable version exists, start the dev server with network access so I can open it on my phone over Wi-Fi, and tell me the address.
5. At the end, write a README covering how to run it locally, how to test on my phone, and how to deploy to GitHub Pages.

## Done when
- I can add, edit and delete expenses on my Pixel, and they survive closing the app.
- All three charts show correct data.
- CSV/JSON export works, and JSON import restores data.
- The app can be installed to the home screen and opens offline.

---

# Addendum: Recurring (fixed) expenses

## Behaviour
- A recurring expense ("series") has: amount, category, note/name, frequency (daily, weekly, monthly, yearly) with an interval (every N units), start date (first occurrence), optional end date, and a paused flag.
- Generated expenses are normal expenses (list, stats, charts, budget bar, CSV/JSON export). They carry `recurringId` + `occurrenceDate` and get a small recurring icon in the list (UI phase).
- **Generation**: the app cannot run in the background, so `generateDueExpenses()` runs on app start and whenever the app becomes visible again. It creates all occurrences up to today that were missed. Future dates are never created.
- **No duplicates**: each series has a cursor `generatedThrough` (processed up to this date), runs happen in one Dexie transaction, and a unique index `[recurringId+occurrenceDate]` guards against double creation (multiple tabs, import).
- **Date rules**: occurrences are computed from the start date, not from the previous one. Monthly on the 31st → last day of shorter months (Jan 31, Feb 28/29, Mar 31). Yearly on 29 Feb → 28 Feb in non-leap years. Pure date math, so time zones and DST do not matter.
- **Editing a series**: affects future occurrences only; already generated expenses stay untouched. Moving the start date back never recreates occurrences before the cursor.
- **Pause/resume**: paused series create nothing; resuming skips the paused period (no catch-up).
- **Deleting a series**: generated expenses are kept as normal expenses (optionally deleted together).
- **Single generated expenses**: can be edited or deleted freely; a deleted one is not regenerated.
- **Past start date**: when creating a series the user chooses whether to create past occurrences (default: yes).
- **Backup**: JSON backup version 2 contains `recurring`; version 1 backups still import. Replace restores 1:1, merge matches identical series and skips existing occurrences. CSV has a last column "Wiederkehrend" (Ja/Nein).
- **Demo data**: rent, streaming and music (monthly) and an insurance (yearly) are recurring series.

## Data model (Dexie version 2, additive migration)
- `recurring`: `++id, categoryId` – `{ id, amountCents, categoryId, note?, frequency, interval, startDate, endDate?, paused, generatedThrough?, createdAt }`
- `expenses`: index `&[recurringId+occurrenceDate]` added; optional fields `recurringId`, `occurrenceDate`.
- Date logic: `src/lib/recurrence.ts` (unit tests with Vitest: `npm test`).

## UI
- Add-expense form: a "🔁 Wiederkehrend" checkbox expands frequency, interval, end date and (for a start date in the past) a "create past occurrences" toggle with a live count. The date field becomes the start date.
- Generated expenses show a small 🔁 icon in the list; editing one only changes that single expense.
- Settings → "Wiederkehrende Ausgaben": list with schedule and next date, tap to edit (changes apply to future occurrences only), ⏸️/▶️ to pause/resume, delete with an optional "also delete generated expenses" checkbox, and "+ Wiederkehrende Ausgabe" to add one.
- Stats: card "Anstehende Fixkosten diesen Monat" (current month only) listing the recurring costs still due this month and their sum.
