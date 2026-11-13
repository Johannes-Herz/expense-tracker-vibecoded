import { describe, expect, it } from 'vitest'
import { categoryBudgetForecasts, forecastTotals, monthlyForecastSeries, type Entry } from './finance'

const exp = (amountCents: number, date = '2026-11-05', categoryId = 1): Entry => ({ type: 'expense', amountCents, date, categoryId })
const inc = (amountCents: number, date = '2026-11-01', categoryId = 20): Entry => ({ type: 'income', amountCents, date, categoryId })

describe('forecastTotals', () => {
  it('keeps booked and planned apart and adds them up', () => {
    const f = forecastTotals([inc(240000), exp(79438)], [exp(44500, '2026-11-20'), inc(10000, '2026-11-25')])
    expect(f.booked).toEqual({ incomeCents: 240000, expenseCents: 79438, balanceCents: 160562 })
    expect(f.planned).toEqual({ incomeCents: 10000, expenseCents: 44500, balanceCents: -34500 })
    expect(f.forecast).toEqual({ incomeCents: 250000, expenseCents: 123938, balanceCents: 126062 })
  })

  it('works without planned entries', () => {
    const f = forecastTotals([exp(1000)], [])
    expect(f.forecast).toEqual(f.booked)
    expect(f.planned).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 })
  })
})

describe('categoryBudgetForecasts', () => {
  const cats = [
    { id: 1, type: 'expense' as const, budgetCents: 10000 },
    { id: 2, type: 'expense' as const },
    { id: 3, type: 'income' as const, budgetCents: 5000 },
  ]

  it('splits booked and planned; level is based on the sum', () => {
    const [row, ...rest] = categoryBudgetForecasts(cats, [exp(6000)], [exp(3000, '2026-11-20')])
    expect(rest).toEqual([])
    expect(row).toMatchObject({ categoryId: 1, bookedCents: 6000, plannedCents: 3000, spentCents: 9000, remainingCents: 1000, level: 'warn' })
  })

  it('turns "over" when planned spending pushes past the budget', () => {
    const [row] = categoryBudgetForecasts(cats, [exp(8000)], [exp(3000, '2026-11-20')])
    expect(row.level).toBe('over')
    expect(row.remainingCents).toBe(-1000)
  })

  it('ignores planned income for expense budgets', () => {
    const [row] = categoryBudgetForecasts(cats, [], [inc(5000, '2026-11-20', 1)])
    expect(row.plannedCents).toBe(0)
  })
})

describe('monthlyForecastSeries', () => {
  it('adds planned entries to their month and reports the planned part', () => {
    const booked = [inc(240000, '2026-10-01'), exp(100000, '2026-10-10'), inc(240000, '2026-11-01'), exp(50000, '2026-11-05')]
    const planned = [exp(20000, '2026-11-20'), inc(240000, '2026-12-01'), exp(60000, '2026-12-03')]
    const s = monthlyForecastSeries(booked, planned, ['2026-10', '2026-11', '2026-12'])
    expect(s).toEqual([
      { month: '2026-10', incomeCents: 240000, expenseCents: 100000, balanceCents: 140000, plannedIncomeCents: 0, plannedExpenseCents: 0 },
      { month: '2026-11', incomeCents: 240000, expenseCents: 70000, balanceCents: 170000, plannedIncomeCents: 0, plannedExpenseCents: 20000 },
      { month: '2026-12', incomeCents: 240000, expenseCents: 60000, balanceCents: 180000, plannedIncomeCents: 240000, plannedExpenseCents: 60000 },
    ])
  })
})
