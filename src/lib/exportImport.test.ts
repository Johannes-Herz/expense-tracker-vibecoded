import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addRecurring, db, generateDueExpenses } from '../db'
import { importBackup, parseBackup } from './exportImport'

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
  rent = { ...rentBase, categoryId: await db.categories.add({ name: 'Housing', emoji: '🏠', color: '#000' } as never) }
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
