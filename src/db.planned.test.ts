import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, generateDueExpenses, type RecurringExpense } from './db'
import { buildCSV } from './lib/exportImport'
import { forecastTotals } from './lib/finance'
import { bookedKey, plannedOccurrences } from './lib/planned'

let seriesId: number

beforeEach(async () => {
  await Promise.all([db.expenses.clear(), db.recurring.clear(), db.categories.clear()])
  const categoryId = (await db.categories.add({ type: 'expense', name: 'Housing', emoji: '🏠', color: '#000' } as never)) as number
  seriesId = (await db.recurring.add({
    type: 'expense',
    amountCents: 44500,
    categoryId,
    note: 'Rent',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-20',
    paused: false,
    generatedThrough: '2026-11-19',
    createdAt: 0,
  } as RecurringExpense)) as number
})

const plannedFor = async (today: string) => {
  const booked = new Set((await db.expenses.toArray()).filter((e) => e.recurringId !== undefined).map((e) => bookedKey(e.recurringId!, e.occurrenceDate!)))
  return plannedOccurrences(await db.recurring.toArray(), today, 1, booked)
}

describe('planned vs. booked', () => {
  it('is planned the day before, then booked exactly once on the day, forecast unchanged', async () => {
    const before = forecastTotals(await db.expenses.toArray(), await plannedFor('2026-11-19'))
    expect((await plannedFor('2026-11-19')).map((p) => p.date)).toEqual(['2026-11-20', '2026-12-20'])
    expect(before.forecast.expenseCents).toBe(2 * 44500)

    expect(await generateDueExpenses('2026-11-20')).toBe(1)
    expect(await generateDueExpenses('2026-11-20')).toBe(0) // running again books nothing more

    const after = forecastTotals((await db.expenses.toArray()), await plannedFor('2026-11-20'))
    expect(after.booked.expenseCents).toBe(44500)
    expect(after.planned.expenseCents).toBe(44500) // only December is left
    expect(after.forecast.expenseCents).toBe(before.forecast.expenseCents) // nothing counted twice
  })

  it('pausing and deleting a series removes its planned entries without any cleanup', async () => {
    await db.recurring.update(seriesId, { paused: true })
    expect(await plannedFor('2026-11-19')).toEqual([])
    await db.recurring.update(seriesId, { paused: false })
    expect(await plannedFor('2026-11-19')).toHaveLength(2)
    await db.recurring.delete(seriesId)
    expect(await plannedFor('2026-11-19')).toEqual([])
  })

  it('never ends up in the stored data, so the CSV export contains no planned entries', async () => {
    expect(await plannedFor('2026-11-19')).toHaveLength(2)
    expect(await db.expenses.count()).toBe(0)
    const rows = (await buildCSV()).split('\r\n')
    expect(rows).toHaveLength(1) // header only
  })
})
