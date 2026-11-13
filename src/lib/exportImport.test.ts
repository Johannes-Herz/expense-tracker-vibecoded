import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addRecurring, db, generateDueExpenses } from '../db'
import { buildCSV, importBackup, parseBackup } from './exportImport'

const rentBase = { amountCents: 72000, note: 'Miete', frequency: 'monthly', interval: 1, startDate: '2026-08-01' } as const
let rent: typeof rentBase & { categoryId: number }

async function snapshot() {
  return parseBackup(
    JSON.stringify({
      app: 'ExpenseTracker',
      version: 2,
      categories: await db.categories.toArray(),
      expenses: await db.expenses.toArray(),
      recurring: await db.recurring.toArray(),
      settings: [],
    }),
  )
}

beforeEach(async () => {
  await Promise.all([db.expenses.clear(), db.recurring.clear(), db.categories.clear()])
  rent = { ...rentBase, categoryId: await db.categories.add({ type: 'expense', name: 'Housing', emoji: '🏠', color: '#000' } as never) }
})

describe('backup with recurring series', () => {
  it('replace restores series and expenses, and generation afterwards creates no duplicates', async () => {
    await addRecurring(rent, true)
    const backup = await snapshot()
    const count = await db.expenses.count()
    await importBackup(backup, 'replace')
    await generateDueExpenses()
    expect(await db.expenses.count()).toBe(count)
    expect(await db.recurring.count()).toBe(1)
  })

  it('merge twice into the same database adds nothing', async () => {
    await addRecurring(rent, true)
    const backup = await snapshot()
    const count = await db.expenses.count()
    expect(await importBackup(backup, 'merge')).toBe(0)
    expect(await importBackup(backup, 'merge')).toBe(0)
    expect(await db.expenses.count()).toBe(count)
    expect(await db.recurring.count()).toBe(1)
  })

  it('merge into an empty database remaps the series link', async () => {
    await addRecurring(rent, true)
    const backup = await snapshot()
    await Promise.all([db.expenses.clear(), db.recurring.clear()])
    await importBackup(backup, 'merge')
    const [series] = await db.recurring.toArray()
    expect((await db.expenses.toArray()).every((e) => e.recurringId === series.id)).toBe(true)
    await generateDueExpenses()
    expect(await db.expenses.count()).toBe(backup.expenses.length)
  })

  it('still accepts old version 1 backups', () => {
    const old = JSON.stringify({ app: 'ExpenseTracker', version: 1, categories: [], expenses: [], settings: [] })
    expect(parseBackup(old).recurring).toEqual([])
  })
})

describe('income in backups and CSV', () => {
  it('old backups without type import as expenses and get the default income categories on replace', async () => {
    const old = JSON.stringify({
      app: 'ExpenseTracker',
      version: 2,
      categories: [{ id: 5, name: 'Housing', emoji: '🏠', color: '#000' }],
      expenses: [{ id: 1, amountCents: 500, categoryId: 5, date: '2026-10-01', createdAt: 1 }],
      recurring: [],
      settings: [{ key: 'monthlyBudgetCents', value: 100000 }, { key: 'theme', value: 'dark' }],
    })
    const backup = parseBackup(old)
    expect(backup.expenses[0].type).toBe('expense')
    expect(backup.categories[0].type).toBe('expense')
    expect(backup.settings.map((x) => x.key)).toEqual(['theme']) // old budget is dropped
    await importBackup(backup, 'replace')
    const cats = await db.categories.toArray()
    expect(cats.filter((c) => c.type === 'income').map((c) => c.name)).toContain('Salary')
    expect((await db.expenses.toArray())[0].type).toBe('expense')
    expect(await db.settings.get('monthlyBudgetCents')).toBeUndefined()
  })

  it('round-trips income, income series and category budgets', async () => {
    const salaryCat = await db.categories.add({ type: 'income', name: 'Salary', emoji: '💼', color: '#0a0' } as never)
    await db.categories.update(rent.categoryId, { budgetCents: 80000 })
    await addRecurring({ type: 'income', categoryId: salaryCat, amountCents: 240000, note: 'Gehalt', frequency: 'monthly', interval: 1, startDate: '2026-08-01' }, true)
    const backup = await snapshot()
    expect(backup.recurring[0].type).toBe('income')
    const count = await db.expenses.count()
    await importBackup(backup, 'replace')
    expect(await db.expenses.count()).toBe(count)
    expect((await db.expenses.toArray()).every((e) => e.type === 'income')).toBe(true)
    expect((await db.categories.get(rent.categoryId))?.budgetCents).toBe(80000)
    await generateDueExpenses()
    expect(await db.expenses.count()).toBe(count) // no duplicates
  })

  it('merge keeps expense and income categories with the same name apart', async () => {
    await db.categories.bulkAdd([
      { type: 'expense', name: 'Other', emoji: '📦', color: '#000' },
      { type: 'income', name: 'Other', emoji: '💰', color: '#000' },
    ] as never)
    const backup = await snapshot()
    const before = await db.categories.count()
    await importBackup(backup, 'merge')
    expect(await db.categories.count()).toBe(before) // nothing duplicated
  })

  it('rejects an invalid type or budget', () => {
    const base = { app: 'ExpenseTracker', version: 3, expenses: [], recurring: [], settings: [] }
    expect(() => parseBackup(JSON.stringify({ ...base, categories: [{ id: 1, name: 'x', type: 'bogus' }] }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...base, categories: [{ id: 1, name: 'x', type: 'expense', budgetCents: -5 }] }))).toThrow()
  })

  it('CSV has a Typ column with Ausgabe / Einnahme', async () => {
    const cat = await db.categories.add({ type: 'income', name: 'Family', emoji: '👪', color: '#000' } as never)
    await db.expenses.bulkAdd([
      { type: 'expense', amountCents: 1250, categoryId: rent.categoryId, date: '2026-10-02', createdAt: 1 },
      { type: 'income', amountCents: 5000, categoryId: cat, date: '2026-10-03', createdAt: 2 },
    ] as never)
    const lines = (await buildCSV()).split('\r\n')
    expect(lines[0]).toContain(';Typ')
    expect(lines[1].endsWith(';Ausgabe')).toBe(true)
    expect(lines[2].endsWith(';Einnahme')).toBe(true)
  })
})

describe('category trend flag in backups', () => {
  it('hideFromTrends survives a replace import, and old backups without it still import', async () => {
    const id = (await db.categories.add({ type: 'expense', name: 'Sparen', emoji: '💰', color: '#000', hideFromTrends: true } as never)) as number
    const backup = await snapshot()
    await importBackup(backup, 'replace')
    expect((await db.categories.get(id))?.hideFromTrends).toBe(true)

    const old = parseBackup(JSON.stringify({ app: 'ExpenseTracker', version: 3, categories: [{ id: 1, name: 'A', type: 'expense' }], expenses: [], recurring: [], settings: [] }))
    await importBackup(old, 'replace')
    expect((await db.categories.toArray())[0].hideFromTrends).toBeUndefined()
  })
})
