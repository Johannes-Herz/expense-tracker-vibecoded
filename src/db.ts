import Dexie, { type EntityTable } from 'dexie'

export interface Category {
  id: number
  name: string
  emoji: string
  color: string // hex, e.g. "#22c55e"
}

export interface Expense {
  id: number
  amountCents: number // EUR in cents, always a positive integer
  categoryId: number
  date: string // local date as "YYYY-MM-DD" (sorts correctly as text)
  note?: string
  createdAt: number // ms since epoch
}

// Simple key/value store for app settings (budget, theme, ...).
export interface Setting {
  key: string
  value: unknown
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Groceries', emoji: '🛒', color: '#22c55e' },
  { name: 'Eating out', emoji: '🍽️', color: '#f97316' },
  { name: 'Transport', emoji: '🚌', color: '#3b82f6' },
  { name: 'Housing', emoji: '🏠', color: '#8b5cf6' },
  { name: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  { name: 'Health', emoji: '💊', color: '#ef4444' },
  { name: 'Leisure', emoji: '🎉', color: '#eab308' },
  { name: 'Subscriptions', emoji: '📺', color: '#06b6d4' },
  { name: 'Travel', emoji: '✈️', color: '#14b8a6' },
  { name: 'Other', emoji: '📦', color: '#64748b' },
]

export const db = new Dexie('ExpenseTracker') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  categories: EntityTable<Category, 'id'>
  settings: EntityTable<Setting, 'key'>
}

// Only indexed fields are listed; other fields are stored anyway.
db.version(1).stores({
  expenses: '++id, date, categoryId',
  categories: '++id',
  settings: 'key',
})

// Fill the category list the very first time the database is created.
db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
})

// ---------- Settings helpers ----------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export const SETTING_BUDGET = 'monthlyBudgetCents' // number | undefined
export const SETTING_THEME = 'theme' // 'system' | 'light' | 'dark'

// ---------- Expense helpers ----------

/** Expenses with date in [startDate, endDate) – both "YYYY-MM-DD". Newest first. */
export async function getExpensesInRange(startDate: string, endDate: string) {
  const list = await db.expenses.where('date').between(startDate, endDate, true, false).toArray()
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function addExpense(data: Omit<Expense, 'id' | 'createdAt'>) {
  return db.expenses.add({ ...data, createdAt: Date.now() } as Expense)
}

export function updateExpense(id: number, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
  return db.expenses.update(id, data)
}

export function deleteExpense(id: number) {
  return db.expenses.delete(id)
}

// ---------- Category helpers ----------

export function addCategory(data: Omit<Category, 'id'>) {
  return db.categories.add(data as Category)
}

export function updateCategory(id: number, data: Partial<Omit<Category, 'id'>>) {
  return db.categories.update(id, data)
}

export async function isCategoryUsed(id: number) {
  return (await db.expenses.where('categoryId').equals(id).count()) > 0
}

/** Deletes a category only if no expense uses it. Returns true if deleted. */
export async function deleteCategoryIfUnused(id: number) {
  if (await isCategoryUsed(id)) return false
  await db.categories.delete(id)
  return true
}

/** Wipe everything and restore the default categories. */
export async function resetAllData() {
  await db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
    await Promise.all([db.expenses.clear(), db.categories.clear(), db.settings.clear()])
    await db.categories.bulkAdd(DEFAULT_CATEGORIES as Category[])
  })
}
