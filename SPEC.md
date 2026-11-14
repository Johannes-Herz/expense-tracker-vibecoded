I want to build a personal expense tracker as an installable PWA for my Google Pixel (Android, Chrome). I'm vibe coding this, so please make sensible technical decisions, explain briefly what you did, and keep the code simple and readable.

First, make a plan. Once I approve the plan, start by saving this entire message as SPEC.md in the project folder so we can refer back to it later. Then build the app step by step.

## Project setup
- Create a new Vite project directly in the current folder (not in a subfolder): React + TypeScript. The folder already contains a .git folder; keep it and don't let the Vite setup delete or overwrite it.
- Styling: Tailwind CSS.
- Storage: IndexedDB via Dexie.js. All data stays on the device: no backend, no login.
- Charts: Chart.js with react-chartjs-2.
- PWA: vite-plugin-pwa (manifest, service worker, offline support, app icon).
- App display name: "Expense Tracker".
- I'm on Windows, using PowerShell.

## Git rules
- A git repository already exists in this folder and the remote "origin" is already set up. Do not run git init and do not change the remote.
- Create a branch called "dev" and do all work on it. Never touch the "main" branch.
- Add a sensible .gitignore.
- Commit locally after each working step with a clear commit message.
- Never push, never pull, never create repositories, and never change any remote settings. I will handle merging and pushing myself.

## Deployment
- The app will be hosted on GitHub Pages from the repo "expense-tracker-vibecoded". Configure the Vite base path for that.
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


# Addendum: Income and category budgets

(German UI text, like the rest of the app.)

## Behaviour
- Besides expenses the app tracks **income** (salary, family, side income, refunds, other). Income can be one-off or recurring with the same frequency options as recurring expenses; the same generator creates the entries.
- The single monthly budget is **removed**. For the selected month the home screen shows income, expenses and what is left (**available = income − expenses**) with a progress bar for the share of the income already spent. Extra income (e.g. money from family) raises that month's available amount automatically.
- **Every month starts fresh**: nothing carries over. The Stats tab shows an informational "Gesamtsaldo" (all-time income − expenses, green/red).
- Optional **monthly budget per expense category** (Settings). The Stats tab shows spent vs. budget per category with a progress bar: green up to 80 %, amber above 80 %, red when over budget, plus the remaining amount.
- Stats: summary cards for income, expenses and balance; savings rate = (income − expenses) / income (not shown without income); grouped bars income vs. expenses for the last 12 months with the balance as a line. All existing expense charts count expenses only.

## Data model (Dexie version 3)
- Income and expenses live in the **same tables** with `type: 'expense' | 'income'` (on `expenses`, `recurring`, `categories`). Amounts stay positive; the type gives the sign. Reason: identical shape, so recurrence generation, list, form, CSV and merge are reused.
- `Category` has an optional `budgetCents` (monthly, expense categories only). Income categories are separate rows (default: Salary, Family, Side income, Refunds, Other).
- Migration v2 → v3 (`db.version(3).upgrade`): all existing expenses, series and categories get `type: 'expense'`; default income categories are added; the old `monthlyBudgetCents` setting is deleted. No row is deleted or re-keyed. Covered by `src/db.migration.test.ts`.

## Calculations (`src/lib/finance.ts`, unit-tested)
`totals`, `availableToSpend`, `spentRatio`, `savingsRate`, `budgetStatus` (ok / warn above 80 % / over above 100 %), `expensesByCategory`, `categoryBudgetStatuses`, `monthlySeries`, `totalBalance`.

## Export / import
- CSV: new last column `Typ` (`Ausgabe` / `Einnahme`); file name `buchungen-<date>.csv`.
- JSON backup `version: 3` includes `type`, income categories and `budgetCents`. Backups from v1/v2 (no `type`) import as expenses; on "replace" the default income categories are added; an old budget setting is ignored. "Merge" matches categories by name **and** type.

## Demo data
Monthly salary (recurring, 2.400 €), occasional money from family, side income and refunds, and budgets for Eating out (150 €), Shopping (100 €) and Leisure (80 €).

## UI (done)
- Add/edit form has an Ausgabe / Einnahme switch (only when adding); the category grid shows the categories of the chosen type. Income is green with a "+" in the list; day totals are net.
- Home: "Verfügbar" (income − expenses), Einnahmen and Ausgaben, and a progress bar of the income already spent (amber above 80 %, red when over). Without income a hint is shown.
- Settings: separate Ausgaben- and Einnahmen-Kategorien (expense categories have an optional monthly budget); "Wiederkehrende Buchungen" with buttons for recurring expenses and income. The old "Monatsbudget" section is gone.
- Stats: cards Einnahmen, Ausgaben, Saldo, Sparquote, Ø pro Tag, Anzahl Ausgaben, Vs. Vormonat; Gesamtsaldo (all months); "Kategorie-Budgets"; "Einnahmen und Ausgaben (12 Monate)" chart (bars + balance line). Doughnut, cumulative line, monthly bars, top 5 and upcoming fixed costs count expenses only.


# Addendum: Planned recurring payments, display name, languages

## Display name
The app is called "Expense Tracker" everywhere the user sees it (manifest `name`/`short_name`, HTML title, README, SPEC, error messages). **Unchanged on purpose:** the backup field `app: "ExpenseTracker"`, the Dexie database name `ExpenseTracker`, the Vite base path and the manifest `start_url`/`scope`, so URL, stored data and old backups keep working.

## Planned recurring payments (forecast)
- Recurring entries are only booked once their date arrives. To show the full month, the app additionally computes **planned** occurrences: recurring expenses/income that are due after today but not booked yet. Horizon: the **current and the next month** (constant `PLANNING_MONTHS_AHEAD = 1` in `src/lib/planned.ts`; not configurable). Past months and months beyond the horizon show nothing planned.
- **Computed on the fly, never stored** (`plannedOccurrences` in `src/lib/planned.ts`, pure and unit-tested; hook `usePlanned` in `src/hooks/useData.ts`). So editing, pausing or deleting a series updates the planned entries immediately, no schema change was needed (still Dexie v3, backup version 3), and planned entries can never appear in CSV/JSON exports.
- **Rules:** paused series plan nothing; end date is inclusive; a series starting in the future is planned from its start date; the 31st / 29 Feb clamp like real occurrences; occurrences on or before the series' cursor (`generatedThrough`) or today are never planned (so a deleted booked occurrence is not resurrected). Booked entries only get dates up to today and planned ones only after today, so nothing is counted twice; occurrences that already exist as real entries are additionally dropped. When the day arrives, `generateDueExpenses` books it exactly once as before.
- **Forecast = booked + planned** (`forecastTotals`, `categoryBudgetForecasts`, `monthlyForecastSeries` in `src/lib/finance.ts`).
  - Forecast is the main number in: home header (Available), income/expenses rows, the income bar; Stats cards (income, expenses, balance, savings rate, each with "booked + planned"); category budgets (solid booked bar + lighter planned segment, status colour from the sum); cumulative line (solid booked until today, dashed forecast to month end; the next month is fully dashed); income vs. expenses chart (lighter stacked planned segment, balance line = forecast).
  - Booked only: average per day, number of expenses, change vs. last month, category doughnut, "last 12 months" bars, top 5, total balance (with one extra line "by month end incl. planned").
- **List:** planned entries appear on their date, dimmed with a dashed border and a "planned" label. They cannot be edited as normal entries; tapping one opens the recurring series form. The old "upcoming fixed costs" card was replaced by a "Planned entries" card.
- **Export/import:** unchanged. Version 3 (and older) backups import as before. The new `language` setting is part of the `settings` array.

## Languages
German (default) and English, chosen in Settings → Appearance → Language, stored in the `settings` table (key `language`) and cached in `localStorage` to avoid a flash of the wrong language. Dictionaries and `useT()` in `src/lib/i18n.ts` (the build fails when a key is missing in one language). Numbers and dates keep German formatting in both languages (`12,50 €`, `12.11.2026`); only weekday/month names follow the language. Not translated: category names and notes (user data), CSV column headers and values (kept for compatibility).


# Addendum: Category trends (Stats tab, "Kategorie-Trends")

- **Purpose:** per expense category, show whether spending is rising, falling or stable compared to the usual level. Booked expenses only (planned payments are not used).
- **Reference month** = the month selected in Stats; **average** = mean of the N full months before it (N = 3, 6 or 12, default 3; the reference month itself is never included). Future months show no trends.
- **Current (unfinished) month – share of a usual month:** Ø is always the average of the N *full* months before the reference month. Spending only ever grows during a month, so only "already above a usual month" is a reliable signal: spent-so-far > Ø × (1 + threshold) → red "▲ +x %". Otherwise the badge is neutral and shows how much of a usual month is used so far, "● 50 % vom Ø" (also "● 0 % vom Ø" when nothing was spent yet); the month is never reported as "falling" while it is unfinished. "▲ neu" only appears when nothing at all was spent in the whole N-month window, so a rarely used category (e.g. Shopping, bought only late in earlier months) is not flagged as new. Past months compare the full month with Ø as before. The sparkline's last bar of the current month is lighter/outlined (month-to-date). *Earlier design (replaced):* comparing to the same day range of the previous months produced false "neu" badges for rarely used categories; that comparison is kept as secondary information, the **pace**, shown in the detail sheet ("Tempo bis heute: +7 % gegenüber den gleichen Tagen der Vormonate (Ø …)", only when the same-days average is above 0).
- **Badge:** change = (current − average) / average. More than +threshold → red "▲ +29 %"; more than −threshold → green "▼ −15 %"; otherwise "● stabil" (exactly at the threshold is stable). Average 0 € with spending → "▲ neu" (no division); average 0 and no spending → stable. (For the current month see the previous bullet.) Not enough history (the app's earliest entry is newer than the first month of the average window) → "zu wenig Daten", no percentage.
- **Rows:** emoji + name; second line "this month · Ø average"; inline-SVG sparkline of the last 6 months with the reference month in the badge color; badge. Sorted by change, biggest increase first ("neu" on top, "zu wenig Daten" last). Categories without any spending in the looked-at months are hidden; income categories never appear. Tapping a row opens a detail sheet with a 12-month line chart and the average as a dashed line.
- **Options:** period selector and "Fixkosten einbeziehen" toggle (off = ignore entries created by recurring series) are remembered per device in `localStorage` (`trendAvgMonths`, `trendIncludeFixed`). The stability threshold (default 10 %, 1–50) is a setting in Settings → "Kategorie-Trends" (`settings` key `trendThresholdPct`, part of backups). Categories have an optional flag `hideFromTrends` (checkbox "In Kategorie-Trends ausblenden" in the category editor, e.g. for savings); no hard-coded category names.
- **No schema change:** still Dexie v3 and backup version 3; the new optional category field is exported/imported with the categories, older backups simply lack it.
- **Code:** pure logic and tests in `src/lib/trends.ts` / `trends.test.ts`; UI in `src/components/CategoryTrends.tsx`, `Sparkline.tsx`, `TrendBadge.tsx`, `TrendDetail.tsx`, `src/charts/CategoryTrendChart.tsx`.


# Addendum: Stats tab layout (groups)

Layout and grouping only; no calculation was changed.

- **Header (sticky):** month selector and a segmented control with three groups. The selected month applies to all groups. The last opened group is remembered per device in `localStorage` (`statsGroup`, values `overview` | `categories` | `history`, default `overview`). Only the active group is rendered, so the charts of the other groups are not mounted.
- **Übersicht (overview):** cards Einnahmen, Ausgaben, Saldo, Sparquote (forecast incl. planned, see the planned-payments addendum); one compact row with Ø pro Tag, Anzahl Ausgaben and Vs. Vormonat (booked expenses only); "Geplante Buchungen"; "Kumuliert im Monat" line; "Größte Ausgaben" (top 5).
- **Kategorien:** "Kategorie-Budgets", "Kategorie-Trends", "Nach Kategorie" (doughnut and list).
- **Verlauf (history):** "Einnahmen und Ausgaben (12 Monate)" chart and the "Gesamtsaldo (alle Monate)" card.
- **Clean-up compared with the single long column:** the separate "Letzte 12 Monate" expense bars were removed (the same expense bars are part of the 12-month income/expense chart); the three secondary numbers share one compact row instead of three cards; the all-time total balance moved from the top to the history group.
- **Code:** `src/screens/StatsScreen.tsx` (data for the selected month, header, group switch), `src/components/stats/` (`OverviewGroup`, `CategoriesGroup`, `HistoryGroup`, `StatsGroupTabs`, shared `Card`/`SummaryCard`/`MiniStat`, `StatsData` type), `src/hooks/useStatsGroup.ts`.
- **Known, not changed:** "Vs. Vormonat" compares the booked expenses of the (unfinished) current month with the full previous month, so it reads negative mid-month; the category trends use a like-for-like comparison instead.


# Addendum: Navigation, Planung tab and Settings structure

Structure/navigation only; data, calculations and the backup format are unchanged.

## Tabs
Übersicht | Statistik | **Planung** | Einstellungen (4 tabs).
- **Planung:** header with a segmented control **Wiederkehrend | Budgets** (last part remembered per device in `localStorage` key `planningView`). *Wiederkehrend* is the list of recurring series (edit, pause/resume, add recurring expense/income). *Budgets* lists the expense categories with their monthly budget and those without; tapping a row opens the normal category editor (single place to edit a budget). The Stats → Kategorien budgets card has a "Verwalten ›" link that opens Planung → Budgets.
- **Einstellungen:** start page with Darstellung (theme) and Sprache, the trend threshold ("Schwelle für „stabil“"), and rows to the sub-pages **Kategorien** (segmented Ausgaben | Einnahmen; list, add) and **Daten & Backup**.
- **Daten & Backup:** card Sicherung (JSON export, CSV export, JSON import); a collapsed section **Erweitert** with demo data (with a warning that it is added to real data) and the red **Gefahrenzone** card with "Alle Daten löschen".
- Messages (import finished, demo loaded, data deleted, errors) appear as a toast above the tab bar.

## Dangerous actions
- Import dialog: "Zusammenführen" is the only primary button; "Alle Daten ersetzen …" is a small red action that opens a second confirmation stating how many current entries will be deleted and requiring the word **ERSETZEN** (English UI: REPLACE).
- Delete all: typed confirmation (LÖSCHEN / DELETE), an "Erst Sicherung exportieren" button inside the dialog, and the final button only enables after 3 seconds.

## Navigation and the Android back gesture
- The current page is part of the URL hash (`#/expenses`, `#/stats`, `#/planning`, `#/settings`, `#/settings/categories`, `#/settings/data`), so GitHub Pages needs no server setup and a reload reopens the same page. The base path and storage are unchanged. Pure parsing in `src/lib/route.ts`.
- Switching tabs replaces the history entry; opening a settings sub-page adds one. The on-screen "‹" behaves like the back gesture (or goes to the parent page when the sub-page was opened directly).
- Open forms, sheets and dialogs (entry/series form, category editor, trend detail, confirmations, import dialog) are **overlays**: while any is open the back gesture closes the topmost one first (`useOverlayBack`). Overlays share a single history entry that is added when the first opens and removed lazily when the last is closed by the UI, which avoids races with the asynchronous history. Logic and tests (fake history): `src/lib/nav.ts`, `nav.test.ts`.
- Back from a tab's start page leaves the app as before.


# Addendum: Weekly budgets per category

Weekly tracking is an extra view on top of the monthly category budgets. Monthly budgets and all existing calculations are unchanged.

## Behaviour
- In the category editor, an expense category **with a monthly budget** has a checkbox "Wöchentlich verfolgen" (Planung → Budgets shows a "wöchentlich" tag for such categories). The weekly budget is **never entered**; it is derived from the monthly budget. Removing the budget switches tracking off.
- **Weeks** are ISO weeks, Monday to Sunday (KW numbers; 2027-01-01 belongs to KW 53 of 2026).
- **Daily budget** = monthly budget ÷ days in the month. **Weekly budget** = daily budget × the days of that week that lie inside the month (a full week = 7 days, a split week only its own days).
- **Split weeks:** a week that touches two months is split by days. Mon 30 Nov – Sun 6 Dec: 30 Nov belongs to November (1 day of November's budget, only spending of 30 Nov), 1–6 Dec to December. Each month's view shows only its part, and the budget of each part comes from that month's own monthly budget.
- **No carry-over:** every week has its own fixed share.
- **Cents:** the day budgets are distributed with cumulative rounding, `floor(monthly × d / daysInMonth)` accumulated per day, and a week gets the difference. So the weekly budgets of a month add up **exactly** to the monthly budget (28/29/30/31 days), each week is within one cent of its exact share, and leftover cents are spread instead of piling up on one week.
- **What counts:** expenses only (never income), booked **plus planned** recurring payments (same forecast principle as the category budgets; planned entries exist only for the current and next month). The detail sheet shows planned amounts as a lighter bar segment.

## Indicator logic
- Spending only grows during a week, so only "over" is reliable while a week runs (same idea as the running month in the category trends):
  - **red ▲** as soon as spent > the week's budget (also while the week is running; exactly on budget is not over);
  - **green ▼** once the week is over and the budget was kept;
  - **grey ●** while the week is still running (or not started) and not exceeded.
- The pro-rata budget for the days passed so far ("Anteilig bis heute") is shown in the detail sheet of the running week only, as information.
- A weekly budget of 0 cents (tiny monthly budget, short week) is exceeded by any spending.

## UI
- **Home list:** the month's entries are grouped by week, newest week first. A divider per week shows "KW 46 · 9.–15. Nov"; a split week shows its part and its day count, "KW 49 · 30. Nov (1 Tag)" / "KW 49 · 1.–6. Dez (6 Tage)" (English: "Wk", "1 day"). Weeks without entries have no divider.
- **Indicators:** on the right of the divider one chip per tracked category (emoji + ▼/▲/●). One line only: at most **4 chips** and a "+N" chip for the rest; over-budget categories are sorted first so they are never hidden. Tapping the divider or a chip opens a bottom sheet (back gesture closes it) with spent vs. weekly budget, progress bar, status and the derivation note per tracked category. Without tracked categories the divider is just a label.

## Data model (Dexie version 4)
- `Category.trackWeekly?: boolean`, not indexed. Migration v3 → v4 only writes `trackWeekly = false` on existing categories; nothing is deleted or re-keyed (`src/db.migration.test.ts`).
- **Backup version 4** includes the flag. Version 1–3 backups import with the flag off (missing = off). A non-boolean flag is rejected. "Merge" leaves categories that already exist (matched by name and type) unchanged, as before.
- Demo data tracks "Eating out" weekly.

## Code
- `src/lib/weeks.ts` (+ tests): ISO week, week segments per month, cent distribution. All date arithmetic uses UTC timestamps, so daylight-saving changes cannot shift days; tests cover split weeks, February in common and leap years, 30/31-day months, KW 53 / KW 1, DST weeks, and "weekly budgets add up to the monthly budget" for many amounts.
- `src/lib/weeklyBudgets.ts` (+ tests): `weekReports` (status per tracked category and week), `trackedCategories`.
- UI: `WeekDivider.tsx`, `WeekDetail.tsx`, `ExpenseList.tsx`, `ExpensesScreen.tsx`, `CategoryEditor.tsx`, `BudgetsView.tsx`.

