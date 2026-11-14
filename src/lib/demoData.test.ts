import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetAllData } from '../db'
import { loadDemoData } from './demoData'

beforeEach(async () => {
  await resetAllData()
  await Promise.all([db.expenses.clear(), db.recurring.clear()])
})

describe('demo data', () => {
  it('adds a recurring salary, some income, expenses and category budgets', async () => {
    await loadDemoData()
    const entries = await db.expenses.toArray()
    const income = entries.filter((e) => e.type === 'income')
    const categories = await db.categories.toArray()
    const catOf = (id: number) => categories.find((c) => c.id === id)!

    // monthly salary for the last 12 months
    const salary = income.filter((e) => e.recurringId !== undefined)
    expect(salary.length).toBeGreaterThanOrEqual(11)
    expect(salary.every((e) => e.amountCents === 240000 && catOf(e.categoryId).name === 'Salary')).toBe(true)
    expect((await db.recurring.toArray()).filter((r) => r.type === 'income')).toHaveLength(1)

    // every entry points to a category of its own type
    expect(entries.every((e) => catOf(e.categoryId).type === e.type)).toBe(true)
    expect(entries.some((e) => e.type === 'expense')).toBe(true)

    const budgets = Object.fromEntries(categories.filter((c) => c.budgetCents).map((c) => [c.name, c.budgetCents]))
    expect(budgets).toEqual({ 'Eating out': 15000, Shopping: 10000, Leisure: 8000 })
    expect(categories.filter((c) => c.trackWeekly).map((c) => c.name)).toEqual(['Eating out'])
  })
})
