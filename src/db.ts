import Dexie, { type EntityTable } from 'dexie'
import { cursorOnResume, initialCursor, planGeneration, type Frequency } from './lib/recurrence'
import { today } from './lib/dates'

/** Expenses and income share the same tables; this field tells them apart. */
export type EntryType = 'expense' | 'income'

export interface Category {
  id: number
  type: EntryType // a category belongs either to expenses or to income
  name: string
  emoji: string
  color: string // hex, e.g. "#22c55e"
  budgetCents?: number // optional monthly budget, expense categories only
}

// An "Expense" row is either an expense or an income (see `type`). Amounts are always positive.
export interface Expense {
  id: number
  type: EntryType
  amountCents: number // EUR in cents, always a positive integer
  categoryId: number
  date: string // local date as "YYYY-MM-DD" (sorts correctly as text)
  note?: string
  createdAt: number // ms since epoch
  // Set only on expenses generated from a recurring series. `occurrenceDate` is the date the
  // schedule produced (it stays the same if the expense's own date is edited later).
  recurringId?: number
  occurrenceDate?: string
}

// A recurring expense definition ("series"). Generated expenses are normal Expense rows.
export interface RecurringExpense {
  id: number
  type: EntryType
  amountCents: number
  categoryId: number
  note?: string // name, e.g. "Miete"
  frequency: Frequency
  interval: number // every N days/weeks/months/years, >= 1
  startDate: string // "YYYY-MM-DD", first occurrence
  endDate?: string // optional last possible occurrence (inclusive)
  paused: boolean
  generatedThrough?: string // cursor: occurrences on or before this date were already processed
  createdAt: number
}

// Simple key/value store for app settings (budget, theme, ...).
export interface Setting {
  key: string
  value: unknown
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'expense', name: 'Groceries', emoji: '🛒', color: '#22c55e' },
  { type: 'expense', name: 'Eating out', emoji: '🍽️', color: '#f97316' },
  { type: 'expense', name: 'Transport', emoji: '🚌', color: '#3b82f6' },
  { type: 'expense', name: 'Housing', emoji: '🏠', color: '#8b5cf6' },
  { type: 'expense', name: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  { type: 'expense', name: 'Health', emoji: '💊', color: '#ef4444' },
  { type: 'expense', name: 'Leisure', emoji: '🎉', color: '#eab308' },
  { type: 'expense', name: 'Subscriptions', emoji: '📺', color: '#06b6d4' },
  { type: 'expense', name: 'Travel', emoji: '✈️', color: '#14b8a6' },
  { type: 'expense', name: 'Other', emoji: '📦', color: '#64748b' },
]

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'income', name: 'Salary', emoji: '💼', color: '#16a34a' },
  { type: 'income', name: 'Family', emoji: '👪', color: '#0ea5e9' },
  { type: 'income', name: 'Side income', emoji: '🛠️', color: '#a855f7' },
  { type: 'income', name: 'Refunds', emoji: '↩️', color: '#f59e0b' },
  { type: 'income', name: 'Other', emoji: '💰', color: '#64748b' },
]

export const ALL_DEFAULT_CATEGORIES = [...DEFAULT_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]

export const db = new Dexie('ExpenseTracker') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  recurring: EntityTable<RecurringExpense, 'id'>
  categories: EntityTable<Category, 'id'>
  settings: EntityTable<Setting, 'key'>
}

// Only indexed fields are listed; other fields are stored anyway.
db.version(1).stores({
  expenses: '++id, date, categoryId',
  categories: '++id',
  settings: 'key',
})

// v2: recurring expenses. The unique compound index guarantees one expense per series occurrence;
// expenses without these fields (all existing ones) are simply not part of that index.
db.version(2).stores({
  expenses: '++id, date, categoryId, &[recurringId+occurrenceDate]',
  recurring: '++id, categoryId',
})

const OLD_SETTING_BUDGET = 'monthlyBudgetCents' // dropped in v3

// v3: income. Every existing expense, series and category is an expense (`type`), income categories
// are added, and the old global monthly budget is dropped (replaced by income-based "available").
// Nothing is deleted or re-keyed, so all existing ids and links stay valid.
db.version(3)
  .stores({ categories: '++id, type' })
  .upgrade(async (tx) => {
    for (const name of ['expenses', 'recurring', 'categories']) {
      await tx.table(name).toCollection().modify((row) => {
        row.type ??= 'expense'
      })
    }
    await tx.table('categories').bulkAdd(DEFAULT_INCOME_CATEGORIES)
    await tx.table('settings').delete(OLD_SETTING_BUDGET)
  })

// Fill the category lists the very first time the database is created.
db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(ALL_DEFAULT_CATEGORIES)
})

// ---------- Settings helpers ----------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export const SETTING_BUDGET = OLD_SETTING_BUDGET // TODO: removed together with the old budget UI
export const SETTING_THEME = 'theme' // 'system' | 'light' | 'dark'

// ---------- Expense helpers ----------

/** Expenses with date in [startDate, endDate) – both "YYYY-MM-DD". Newest first. */
export async function getExpensesInRange(startDate: string, endDate: string) {
  const list = await db.expenses.where('date').between(startDate, endDate, true, false).toArray()
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

type WithOptionalType<T> = Omit<T, 'type'> & { type?: EntryType }

export function addExpense(data: WithOptionalType<Omit<Expense, 'id' | 'createdAt'>>) {
  return db.expenses.add({ type: 'expense', ...data, createdAt: Date.now() } as Expense)
}

export function updateExpense(id: number, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
  return db.expenses.update(id, data)
}

export function deleteExpense(id: number) {
  return db.expenses.delete(id)
}

// ---------- Recurring expense helpers ----------

/** Key range matching all expenses of one series in the [recurringId+occurrenceDate] index. */
const seriesRange = (id: number) => [
  [id, ''],
  [id, '\uffff'],
]

/**
 * Creates every occurrence that is due (up to today) for all active series, then moves each
 * series' cursor to today. Safe to call any number of times, from any number of tabs:
 * it runs in one transaction, the cursor skips processed dates, and the unique index backs it up.
 * Returns the number of expenses created.
 */
export function generateDueExpenses(todayStr: string = today()): Promise<number> {
  return db.transaction('rw', db.recurring, db.expenses, async () => {
    let created = 0
    for (const series of await db.recurring.toArray()) {
      const { occurrences, newCursor } = planGeneration(series, todayStr)
      if (occurrences.length > 0) {
        const [lo, hi] = seriesRange(series.id)
        const existing = new Set(
          (await db.expenses.where('[recurringId+occurrenceDate]').between(lo, hi, true, true).toArray()).map(
            (e) => e.occurrenceDate,
          ),
        )
        const now = Date.now()
        const fresh = occurrences
          .filter((date) => !existing.has(date))
          .map((date, i) => ({
            type: series.type,
            amountCents: series.amountCents,
            categoryId: series.categoryId,
            date,
            note: series.note,
            createdAt: now + i,
            recurringId: series.id,
            occurrenceDate: date,
          }))
        await db.expenses.bulkAdd(fresh as Expense[])
        created += fresh.length
      }
      if (newCursor !== series.generatedThrough) await db.recurring.update(series.id, { generatedThrough: newCursor })
    }
    return created
  })
}

/** Create a series. `backfill` = also create occurrences between the start date and today. */
export async function addRecurring(
  data: WithOptionalType<Omit<RecurringExpense, 'id' | 'createdAt' | 'paused' | 'generatedThrough'>>,
  backfill: boolean,
): Promise<number> {
  const id = await db.recurring.add({
    type: 'expense',
    ...data,
    paused: false,
    generatedThrough: initialCursor(backfill, today()),
    createdAt: Date.now(),
  } as RecurringExpense)
  await generateDueExpenses()
  return id
}

/** Edit a series. Only future occurrences are affected; generated expenses are never touched. */
export function updateRecurring(id: number, data: Partial<Omit<RecurringExpense, 'id' | 'createdAt' | 'generatedThrough'>>) {
  return db.recurring.update(id, data)
}

/** Pause or resume. Resuming skips the paused period instead of catching up. */
export async function setRecurringPaused(id: number, paused: boolean) {
  const series = await db.recurring.get(id)
  if (!series) return
  await db.recurring.update(id, {
    paused,
    generatedThrough: paused ? series.generatedThrough : cursorOnResume(series.generatedThrough, today()),
  })
}

/** Delete a series. Its generated expenses are kept as normal expenses unless `deleteExpenses` is set. */
export function deleteRecurring(id: number, opts: { deleteExpenses?: boolean } = {}) {
  return db.transaction('rw', db.recurring, db.expenses, async () => {
    const [lo, hi] = seriesRange(id)
    const generated = db.expenses.where('[recurringId+occurrenceDate]').between(lo, hi, true, true)
    if (opts.deleteExpenses) await generated.delete()
    else
      await generated.modify((e) => {
        delete e.recurringId
        delete e.occurrenceDate
      })
    await db.recurring.delete(id)
  })
}

// ---------- Category helpers ----------

export function addCategory(data: WithOptionalType<Omit<Category, 'id'>>) {
  return db.categories.add({ type: 'expense', ...data } as Category)
}

export function updateCategory(id: number, data: Partial<Omit<Category, 'id'>>) {
  return db.categories.update(id, data)
}

export async function isCategoryUsed(id: number) {
  const [expenses, series] = await Promise.all([
    db.expenses.where('categoryId').equals(id).count(),
    db.recurring.where('categoryId').equals(id).count(),
  ])
  return expenses + series > 0
}

/** Deletes a category only if no expense uses it. Returns true if deleted. */
export async function deleteCategoryIfUnused(id: number) {
  if (await isCategoryUsed(id)) return false
  await db.categories.delete(id)
  return true
}

/** Wipe everything and restore the default categories. */
export async function resetAllData() {
  await db.transaction('rw', db.expenses, db.recurring, db.categories, db.settings, async () => {
    await Promise.all([db.expenses.clear(), db.recurring.clear(), db.categories.clear(), db.settings.clear()])
    await db.categories.bulkAdd(ALL_DEFAULT_CATEGORIES as Category[])
  })
}
