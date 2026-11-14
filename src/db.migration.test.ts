import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

// Builds a database exactly as version 2 of the app left it, then opens it with the current schema.
describe('database upgrade to v3 (income)', () => {
  it('keeps all existing data, marks it as expenses, adds income categories and drops the old budget', async () => {
    const old = new Dexie('ExpenseTracker')
    old.version(1).stores({ expenses: '++id, date, categoryId', categories: '++id', settings: 'key' })
    old.version(2).stores({
      expenses: '++id, date, categoryId, &[recurringId+occurrenceDate]',
      recurring: '++id, categoryId',
    })
    await old.table('categories').bulkAdd([
      { name: 'Groceries', emoji: '🛒', color: '#22c55e' },
      { name: 'Housing', emoji: '🏠', color: '#8b5cf6' },
    ])
    await old.table('expenses').bulkAdd([
      { amountCents: 1250, categoryId: 1, date: '2026-10-03', note: 'Rewe', createdAt: 1 },
      { amountCents: 72000, categoryId: 2, date: '2026-10-01', note: 'Miete', createdAt: 2, recurringId: 1, occurrenceDate: '2026-10-01' },
    ])
    await old.table('recurring').add({
      amountCents: 72000, categoryId: 2, note: 'Miete', frequency: 'monthly', interval: 1,
      startDate: '2026-08-01', paused: false, generatedThrough: '2026-10-01', createdAt: 3,
    })
    await old.table('settings').bulkAdd([
      { key: 'monthlyBudgetCents', value: 100000 },
      { key: 'theme', value: 'dark' },
    ])
    old.close()

    const { db } = await import('./db')

    const expenses = await db.expenses.orderBy('id').toArray()
    expect(expenses.map((e) => [e.id, e.amountCents, e.categoryId, e.note, e.recurringId])).toEqual([
      [1, 1250, 1, 'Rewe', undefined],
      [2, 72000, 2, 'Miete', 1],
    ])
    expect(expenses.every((e) => e.type === 'expense')).toBe(true)

    const series = await db.recurring.toArray()
    expect(series).toHaveLength(1)
    expect(series[0].type).toBe('expense')
    expect(series[0].generatedThrough).toBe('2026-10-01')

    const categories = await db.categories.orderBy('id').toArray()
    expect(categories.slice(0, 2).map((c) => [c.id, c.name, c.type])).toEqual([
      [1, 'Groceries', 'expense'],
      [2, 'Housing', 'expense'],
    ])
    const income = categories.filter((c) => c.type === 'income')
    expect(income.map((c) => c.name)).toEqual(['Salary', 'Family', 'Side income', 'Refunds', 'Other'])

    expect(await db.settings.get('monthlyBudgetCents')).toBeUndefined()
    expect((await db.settings.get('theme'))?.value).toBe('dark')
  })
})

// Builds a database as version 3 of the app left it (the database name is fixed, so the earlier
// test's database is deleted and db.ts is loaded again), then opens it with the current schema.
describe('database upgrade to v4 (weekly budgets)', () => {
  it('keeps categories, budgets and entries; weekly tracking starts off', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    await Dexie.delete('ExpenseTracker')
    const old = new Dexie('ExpenseTracker')
    old.version(1).stores({ expenses: '++id, date, categoryId', categories: '++id', settings: 'key' })
    old.version(2).stores({ expenses: '++id, date, categoryId, &[recurringId+occurrenceDate]', recurring: '++id, categoryId' })
    old.version(3).stores({ categories: '++id, type' })
    await old.table('categories').bulkAdd([
      { type: 'expense', name: 'Groceries', emoji: '🛒', color: '#22c55e', budgetCents: 40000, hideFromTrends: true },
      { type: 'expense', name: 'Housing', emoji: '🏠', color: '#8b5cf6' },
      { type: 'income', name: 'Salary', emoji: '💼', color: '#16a34a' },
    ])
    await old.table('expenses').add({ type: 'expense', amountCents: 1250, categoryId: 1, date: '2026-10-03', note: 'Rewe', createdAt: 1 })
    await old.table('settings').add({ key: 'theme', value: 'dark' })
    old.close()

    const { db } = await import('./db')
    const cats = await db.categories.orderBy('id').toArray()
    expect(cats.map((c) => [c.id, c.name, c.budgetCents, c.hideFromTrends, c.trackWeekly])).toEqual([
      [1, 'Groceries', 40000, true, false],
      [2, 'Housing', undefined, undefined, false],
      [3, 'Salary', undefined, undefined, false],
    ])
    expect(await db.expenses.count()).toBe(1)
    expect((await db.expenses.get(1))?.note).toBe('Rewe')
    expect((await db.settings.get('theme'))?.value).toBe('dark')
    expect(db.verno).toBe(4)
  })
})
