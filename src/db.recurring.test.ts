import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addExpense, addRecurring, db, deleteRecurring, generateDueExpenses, setRecurringPaused } from './db'

const rent = { amountCents: 72000, categoryId: 1, note: 'Miete', frequency: 'monthly', interval: 1, startDate: '2026-08-01' } as const

beforeEach(async () => {
  await Promise.all([db.expenses.clear(), db.recurring.clear()])
})

describe('generateDueExpenses', () => {
  it('backfills once and never creates duplicates, even when run repeatedly or in parallel', async () => {
    const id = await addRecurring(rent, true)
    expect(await db.expenses.where('recurringId').equals(id).count()).toBeGreaterThan(0)
    const before = await db.expenses.count()
    await Promise.all([generateDueExpenses(), generateDueExpenses(), generateDueExpenses()])
    expect(await db.expenses.count()).toBe(before)
  })

  it('does not regenerate a deleted generated expense', async () => {
    await addRecurring(rent, true)
    const [first] = await db.expenses.orderBy('date').toArray()
    await db.expenses.delete(first.id)
    await generateDueExpenses()
    expect(await db.expenses.get(first.id)).toBeUndefined()
    expect(await db.expenses.where('date').equals(first.date).count()).toBe(0)
  })

  it('creates future occurrences later and nothing while paused', async () => {
    const id = await addRecurring({ ...rent, startDate: '2026-01-01' }, false)
    await setRecurringPaused(id, true)
    expect(await generateDueExpenses('2099-01-01')).toBe(0)
    await setRecurringPaused(id, false) // resume skips the paused period
    expect(await generateDueExpenses('2099-01-01')).toBeGreaterThan(0)
  })

  it('keeps expenses on delete by default and removes them on request', async () => {
    const a = await addRecurring(rent, true)
    const total = await db.expenses.count()
    await deleteRecurring(a)
    expect(await db.expenses.count()).toBe(total)
    expect((await db.expenses.toArray()).every((e) => e.recurringId === undefined)).toBe(true)

    const b = await addRecurring(rent, true)
    await addExpense({ amountCents: 100, categoryId: 1, date: '2026-09-09' })
    await deleteRecurring(b, { deleteExpenses: true })
    expect((await db.expenses.where('recurringId').equals(b).toArray()).length).toBe(0)
    expect(await db.expenses.count()).toBe(total + 1)
  })

  it('allows many manual expenses without series fields (unique index ignores them)', async () => {
    await addExpense({ amountCents: 1, categoryId: 1, date: '2026-01-01' })
    await addExpense({ amountCents: 1, categoryId: 1, date: '2026-01-01' })
    expect(await db.expenses.count()).toBe(2)
  })
})
