// Tiny home-made i18n: two dictionaries (German = default, English) with the same keys.
// `en: Dict` makes the build fail when a translation is missing.
// Numbers and dates keep German formatting in both languages (see format.ts); only words differ.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSetting, SETTING_LANGUAGE } from '../db'
import type { Frequency } from './recurrence'

export type Lang = 'de' | 'en'
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

const de = {
  // tabs
  tabOverview: 'Übersicht',
  tabStats: 'Statistik',
  tabSettings: 'Einstellungen',
  // common
  cancel: 'Abbrechen',
  delete: 'Löschen',
  save: 'Speichern',
  close: 'Schließen',
  unknown: 'Unbekannt',
  income: 'Einnahme',
  expense: 'Ausgabe',
  incomes: 'Einnahmen',
  expenses: 'Ausgaben',
  balance: 'Saldo',
  prevMonth: 'Vorheriger Monat',
  nextMonth: 'Nächster Monat',
  // overview
  available: 'Verfügbar',
  noIncomeHint: 'Keine Einnahmen in diesem Monat – füge eine Einnahme hinzu, um zu sehen, was verfügbar ist.',
  noEntriesMonth: 'Keine Buchungen in diesem Monat.',
  tapPlus: 'Tippe auf + um eine hinzuzufügen.',
  addEntry: 'Buchung hinzufügen',
  budgetOf: (spent: string, budget: string) => `${spent} von ${budget}`,
  budgetLeft: 'übrig',
  budgetOver: 'drüber',
  recurring: 'Wiederkehrend',
  // entry form
  formEditSeries: (inc: boolean) => (inc ? 'Wiederkehrende Einnahme bearbeiten' : 'Wiederkehrende Ausgabe bearbeiten'),
  formNewSeries: (inc: boolean) => (inc ? 'Neue wiederkehrende Einnahme' : 'Neue wiederkehrende Ausgabe'),
  formEdit: (inc: boolean) => (inc ? 'Einnahme bearbeiten' : 'Ausgabe bearbeiten'),
  formNew: (inc: boolean) => (inc ? 'Neue Einnahme' : 'Neue Ausgabe'),
  startDate: 'Startdatum (erste Ausführung)',
  seriesNamePlaceholder: 'Name, z. B. Miete',
  notePlaceholder: 'Notiz (optional)',
  partOfRecurring: '🔁 Teil einer wiederkehrenden Buchung. Änderungen gelten nur für diese Buchung.',
  recurringCheckbox: '🔁 Wiederkehrend',
  recurringInvalid: 'Intervall mindestens 1; Enddatum nicht vor dem Startdatum.',
  createPast: 'Vergangene Ausführungen anlegen',
  createPastCount: (n: number) => `${n} Buchungen werden angelegt.`,
  createPastNone: 'Es werden nur heutige und künftige Buchungen angelegt.',
  seriesChangeNote: 'Änderungen gelten nur für künftige Ausführungen. Bereits angelegte Buchungen bleiben unverändert.',
  deleteSeriesTitle: (inc: boolean) => (inc ? 'Wiederkehrende Einnahme löschen?' : 'Wiederkehrende Ausgabe löschen?'),
  deleteEntryTitle: (inc: boolean) => (inc ? 'Einnahme löschen?' : 'Ausgabe löschen?'),
  deleteSeriesMsg: 'Es werden keine weiteren Buchungen mehr angelegt.',
  deleteEntryMsg: 'Das kann nicht rückgängig gemacht werden.',
  alsoDeleteGenerated: 'Auch alle bereits angelegten Buchungen dieser Serie löschen',
  // recurring fields
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
  every: 'Alle',
  interval: 'Intervall',
  endDateOptional: 'Enddatum (optional)',
  unitOf: (f: Frequency, plural: boolean) =>
    ({ daily: ['Tag', 'Tage'], weekly: ['Woche', 'Wochen'], monthly: ['Monat', 'Monate'], yearly: ['Jahr', 'Jahre'] })[f][plural ? 1 : 0],
  schedule: (f: Frequency, n: number) =>
    n === 1
      ? { daily: 'täglich', weekly: 'wöchentlich', monthly: 'monatlich', yearly: 'jährlich' }[f]
      : `alle ${n} ${{ daily: 'Tage', weekly: 'Wochen', monthly: 'Monate', yearly: 'Jahre' }[f]}`,
  // category editor
  catEdit: 'Kategorie bearbeiten',
  catNewIncome: 'Neue Einnahmen-Kategorie',
  catNewExpense: 'Neue Ausgaben-Kategorie',
  name: 'Name',
  customColor: 'Eigene Farbe',
  monthlyBudgetOptional: 'Monatsbudget (optional)',
  noBudget: 'Kein Budget',
  catInUseTitle: 'Kategorie wird verwendet',
  catInUseMsg: 'Es gibt noch Buchungen in dieser Kategorie. Ändere oder lösche diese zuerst.',
  catDeleteTitle: 'Kategorie löschen?',
  ok: 'OK',
  // confirm dialog
  typeToConfirm: (word: string) => `Tippe „${word}“ zur Bestätigung`,
  // settings
  settingsTitle: 'Einstellungen',
  appearance: 'Darstellung',
  themeSystem: 'System',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  language: 'Sprache',
  expenseCategories: 'Ausgaben-Kategorien',
  incomeCategories: 'Einnahmen-Kategorien',
  addCategory: '+ Kategorie hinzufügen',
  budgetHint: 'Tippe auf eine Kategorie, um ein Monatsbudget festzulegen. Es erscheint im Tab „Statistik“.',
  recurringEntries: 'Wiederkehrende Buchungen',
  noneYet: 'Noch keine. Miete, Abos, Gehalt oder Versicherungen werden automatisch angelegt.',
  statusPaused: 'pausiert',
  statusNext: (date: string) => `nächste: ${date}`,
  statusEnded: 'beendet',
  resume: 'Fortsetzen',
  pause: 'Pausieren',
  addRecurringExpense: '+ Wiederkehrende Ausgabe',
  addRecurringIncome: '+ Wiederkehrende Einnahme',
  data: 'Daten',
  exportCsv: '📄 Export als CSV',
  exportJson: '💾 Sicherung (JSON) exportieren',
  importJson: '📥 Sicherung (JSON) importieren',
  loadDemo: '🎲 Demo-Daten laden',
  deleteAll: '🗑️ Alle Daten löschen',
  importDone: (n: number, replaced: boolean) => `Import abgeschlossen: ${n} Buchungen ${replaced ? 'geladen' : 'hinzugefügt'}.`,
  demoLoaded: (n: number) => `${n} Demo-Buchungen hinzugefügt.`,
  importTitle: 'Sicherung importieren',
  importInfo: (entries: number, cats: number) =>
    `Die Datei enthält ${entries} Buchungen und ${cats} Kategorien. Ersetzen löscht alle aktuellen Daten, Zusammenführen behält sie und überspringt Duplikate.`,
  merge: 'Zusammenführen',
  replace: 'Ersetzen',
  wipeTitle: 'Alle Daten löschen?',
  wipeMsg: 'Alle Buchungen, Kategorien und Einstellungen werden unwiderruflich gelöscht. Erstelle vorher eine Sicherung!',
  wipeWord: 'LÖSCHEN',
  wipeConfirm: 'Alles löschen',
  wipeDone: 'Alle Daten wurden gelöscht.',
  budgetPerMonth: (amount: string) => `Budget ${amount} / Monat`,
  errInvalidJson: 'Die Datei ist kein gültiges JSON.',
  errNotBackup: 'Das ist keine Expense-Tracker-Sicherung.',
  errInvalidData: 'Die Sicherung enthält ungültige Daten.',
  // stats
  totalBalance: 'Gesamtsaldo (alle Monate)',
  totalBalanceInfo: 'Alle Einnahmen minus alle Ausgaben – nur zur Information, es wird nichts in den nächsten Monat übertragen.',
  savingsRate: 'Sparquote',
  perDay: 'Ø pro Tag',
  countExpenses: 'Anzahl Ausgaben',
  vsPrevMonth: 'Vs. Vormonat',
  categoryBudgets: 'Kategorie-Budgets',
  noBudgetsYet: 'Noch keine Budgets. Lege in den Einstellungen bei einer Ausgaben-Kategorie ein Monatsbudget fest.',
  incomeVsExpenses: 'Einnahmen und Ausgaben (12 Monate)',
  upcomingFixed: 'Anstehende Fixkosten diesen Monat',
  noExpensesMonth: 'Keine Ausgaben in diesem Monat.',
  byCategory: 'Nach Kategorie',
  cumulative: 'Kumuliert im Monat',
  last12: 'Letzte 12 Monate',
  biggest: 'Größte Ausgaben',
  total: 'Gesamt',
  dayN: (n: string) => `Tag ${n}`,
  // planned (recurring entries not booked yet)
  booked: 'gebucht',
  planned: 'geplant',
  forecast: 'Prognose',
  availableForecast: 'Verfügbar (Prognose)',
  bookedSoFar: 'Bisher gebucht',
  // "794,38 € gebucht + 445,00 € geplant = 1.239,38 €"
  bookedPlanned: (booked: string, planned: string, total: string, minus = false) =>
    `${booked} gebucht ${minus ? '−' : '+'} ${planned} geplant = ${total}`,
  budgetOfPlanned: (spent: string, planned: string, budget: string) => `${spent} gebucht + ${planned} geplant von ${budget}`,
  plannedHorizonHint: 'Geplante Buchungen werden nur für den aktuellen und den nächsten Monat angezeigt.',
  plannedEntry: 'Geplante wiederkehrende Buchung – tippen, um die Serie zu öffnen',
  plannedCard: 'Geplant in diesem Monat',
  plannedNote: 'Wird am Fälligkeitstag automatisch gebucht.',
}

// Widened so that `en` only has to match the shape (strings / functions returning strings).
type Dict = { [K in keyof typeof de]: (typeof de)[K] extends (...a: infer A) => string ? (...a: A) => string : string }

const en: Dict = {
  tabOverview: 'Overview',
  tabStats: 'Stats',
  tabSettings: 'Settings',
  cancel: 'Cancel',
  delete: 'Delete',
  save: 'Save',
  close: 'Close',
  unknown: 'Unknown',
  income: 'Income',
  expense: 'Expense',
  incomes: 'Income',
  expenses: 'Expenses',
  balance: 'Balance',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  available: 'Available',
  noIncomeHint: 'No income this month – add income to see what is available.',
  noEntriesMonth: 'No entries this month.',
  tapPlus: 'Tap + to add one.',
  addEntry: 'Add entry',
  budgetOf: (spent, budget) => `${spent} of ${budget}`,
  budgetLeft: 'left',
  budgetOver: 'over',
  recurring: 'Recurring',
  formEditSeries: (inc) => (inc ? 'Edit recurring income' : 'Edit recurring expense'),
  formNewSeries: (inc) => (inc ? 'New recurring income' : 'New recurring expense'),
  formEdit: (inc) => (inc ? 'Edit income' : 'Edit expense'),
  formNew: (inc) => (inc ? 'New income' : 'New expense'),
  startDate: 'Start date (first occurrence)',
  seriesNamePlaceholder: 'Name, e.g. Rent',
  notePlaceholder: 'Note (optional)',
  partOfRecurring: '🔁 Part of a recurring entry. Changes only apply to this entry.',
  recurringCheckbox: '🔁 Recurring',
  recurringInvalid: 'Interval must be at least 1; end date must not be before the start date.',
  createPast: 'Create past occurrences',
  createPastCount: (n) => `${n} entries will be created.`,
  createPastNone: 'Only entries for today and the future will be created.',
  seriesChangeNote: 'Changes only apply to future occurrences. Entries that were already created stay unchanged.',
  deleteSeriesTitle: (inc) => (inc ? 'Delete recurring income?' : 'Delete recurring expense?'),
  deleteEntryTitle: (inc) => (inc ? 'Delete income?' : 'Delete expense?'),
  deleteSeriesMsg: 'No further entries will be created.',
  deleteEntryMsg: 'This cannot be undone.',
  alsoDeleteGenerated: 'Also delete all entries already created by this series',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  every: 'Every',
  interval: 'Interval',
  endDateOptional: 'End date (optional)',
  unitOf: (f, plural) =>
    ({ daily: ['day', 'days'], weekly: ['week', 'weeks'], monthly: ['month', 'months'], yearly: ['year', 'years'] })[f][plural ? 1 : 0],
  schedule: (f, n) =>
    n === 1
      ? { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }[f]
      : `every ${n} ${{ daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' }[f]}`,
  catEdit: 'Edit category',
  catNewIncome: 'New income category',
  catNewExpense: 'New expense category',
  name: 'Name',
  customColor: 'Custom color',
  monthlyBudgetOptional: 'Monthly budget (optional)',
  noBudget: 'No budget',
  catInUseTitle: 'Category in use',
  catInUseMsg: 'There are still entries in this category. Change or delete them first.',
  catDeleteTitle: 'Delete category?',
  ok: 'OK',
  typeToConfirm: (word) => `Type “${word}” to confirm`,
  settingsTitle: 'Settings',
  appearance: 'Appearance',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  expenseCategories: 'Expense categories',
  incomeCategories: 'Income categories',
  addCategory: '+ Add category',
  budgetHint: 'Tap a category to set a monthly budget. It shows up in the “Stats” tab.',
  recurringEntries: 'Recurring entries',
  noneYet: 'None yet. Rent, subscriptions, salary or insurance are created automatically.',
  statusPaused: 'paused',
  statusNext: (date) => `next: ${date}`,
  statusEnded: 'ended',
  resume: 'Resume',
  pause: 'Pause',
  addRecurringExpense: '+ Recurring expense',
  addRecurringIncome: '+ Recurring income',
  data: 'Data',
  exportCsv: '📄 Export as CSV',
  exportJson: '💾 Export backup (JSON)',
  importJson: '📥 Import backup (JSON)',
  loadDemo: '🎲 Load demo data',
  deleteAll: '🗑️ Delete all data',
  importDone: (n, replaced) => `Import finished: ${n} entries ${replaced ? 'loaded' : 'added'}.`,
  demoLoaded: (n) => `${n} demo entries added.`,
  importTitle: 'Import backup',
  importInfo: (entries, cats) =>
    `The file contains ${entries} entries and ${cats} categories. Replace deletes all current data; merge keeps it and skips duplicates.`,
  merge: 'Merge',
  replace: 'Replace',
  wipeTitle: 'Delete all data?',
  wipeMsg: 'All entries, categories and settings will be deleted permanently. Make a backup first!',
  wipeWord: 'DELETE',
  wipeConfirm: 'Delete everything',
  wipeDone: 'All data was deleted.',
  budgetPerMonth: (amount) => `Budget ${amount} / month`,
  errInvalidJson: 'The file is not valid JSON.',
  errNotBackup: 'This is not an Expense Tracker backup.',
  errInvalidData: 'The backup contains invalid data.',
  totalBalance: 'Total balance (all months)',
  totalBalanceInfo: 'All income minus all expenses – for information only, nothing is carried over to the next month.',
  savingsRate: 'Savings rate',
  perDay: 'Avg. per day',
  countExpenses: 'Number of expenses',
  vsPrevMonth: 'Vs. last month',
  categoryBudgets: 'Category budgets',
  noBudgetsYet: 'No budgets yet. Set a monthly budget on an expense category in Settings.',
  incomeVsExpenses: 'Income and expenses (12 months)',
  upcomingFixed: 'Upcoming fixed costs this month',
  noExpensesMonth: 'No expenses this month.',
  byCategory: 'By category',
  cumulative: 'Cumulative in month',
  last12: 'Last 12 months',
  biggest: 'Biggest expenses',
  total: 'Total',
  dayN: (n) => `Day ${n}`,
  booked: 'booked',
  planned: 'planned',
  forecast: 'Forecast',
  availableForecast: 'Available (forecast)',
  bookedSoFar: 'Booked so far',
  bookedPlanned: (booked, planned, total, minus = false) =>
    `${booked} booked ${minus ? '−' : '+'} ${planned} planned = ${total}`,
  budgetOfPlanned: (spent, planned, budget) => `${spent} booked + ${planned} planned of ${budget}`,
  plannedHorizonHint: 'Planned entries are only shown for the current and the next month.',
  plannedEntry: 'Planned recurring entry – tap to open the series',
  plannedCard: 'Planned this month',
  plannedNote: 'Booked automatically on the due date.',
}

const DICTS: Record<Lang, Dict> = { de, en }

// The language is also cached in localStorage so the first paint already uses it (no German flash).
// The `settings` table stays the source of truth (it is part of backups).
const CACHE_KEY = 'language'
function readCache(): Lang {
  try {
    return localStorage.getItem(CACHE_KEY) === 'en' ? 'en' : 'de'
  } catch {
    return 'de'
  }
}
let current: Lang = readCache()

export function setLanguageCache(lang: Lang) {
  current = lang
  try {
    localStorage.setItem(CACHE_KEY, lang)
  } catch {
    /* storage unavailable: fine, the setting still works */
  }
  document.documentElement.lang = lang
}
if (typeof document !== 'undefined') document.documentElement.lang = current

export const getLang = (): Lang => current

/** Current dictionary for non-React code (e.g. error messages). */
export const tNow = (): Dict => DICTS[current]

/** Dictionary for components; re-renders when the language changes in Settings. */
export function useT(): Dict {
  const saved = useLiveQuery(() => getSetting<Lang>(SETTING_LANGUAGE), [])
  if (saved && saved !== current && DICTS[saved]) setLanguageCache(saved)
  return DICTS[current]
}
