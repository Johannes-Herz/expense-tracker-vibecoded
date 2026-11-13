import { describe, expect, it } from 'vitest'
import {
  availableToSpend,
  budgetStatus,
  categoryBudgetStatuses,
  expensesByCategory,
  monthlySeries,
  savingsRate,
  spentRatio,
  totalBalance,
  totals,
  type Entry,
} from './finance'

const exp = (amountCents: number, date = '2026-11-05', categoryId = 1): Entry => ({ type: 'expense', amountCents, date, categoryId })
const inc = (amountCents: number, date = '2026-11-01', categoryId = 20): Entry => ({ type: 'income', amountCents, date, categoryId })

describe('totals / available to spend', () => {
  it('is income − expenses', () => {
    const t = totals([inc(240000), exp(72000), exp(8000)])
    expect(t).toEqual({ incomeCents: 240000, expenseCents: 80000, balanceCents: 160000 })
    expect(availableToSpend(t)).toBe(160000)
  })

  it('goes up automatically when extra income arrives', () => {
    const before = availableToSpend(totals([inc(240000), exp(100000)]))
    const after = availableToSpend(totals([inc(240000), inc(15000, '2026-11-12'), exp(100000)]))
    expect(after - before).toBe(15000)
  })

  it('is negative when overspent and 0 for no data', () => {
    expect(availableToSpend(totals([inc(1000), exp(1500)]))).toBe(-500)
    expect(totals([])).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 })
  })

  it('spentRatio is expenses / income, 0 without income', () => {
    expect(spentRatio(totals([inc(200), exp(50)]))).toBe(0.25)
    expect(spentRatio(totals([inc(200), exp(300)]))).toBe(1.5)
    expect(spentRatio(totals([exp(300)]))).toBe(0)
  })
})

describe('savingsRate', () => {
  it('is (income − expenses) / income', () => {
    expect(savingsRate(totals([inc(200000), exp(150000)]))).toBe(0.25)
  })
  it('is negative when overspent', () => {
    expect(savingsRate(totals([inc(1000), exp(1500)]))).toBe(-0.5)
  })
  it('is null without income', () => {
    expect(savingsRate(totals([exp(1500)]))).toBeNull()
    expect(savingsRate(totals([]))).toBeNull()
  })
})

describe('budgetStatus', () => {
  it('is ok up to and including 80 %', () => {
    expect(budgetStatus(8000, 10000)).toMatchObject({ level: 'ok', remainingCents: 2000, ratio: 0.8 })
  })
  it('warns above 80 % and at exactly 100 %', () => {
    expect(budgetStatus(8001, 10000).level).toBe('warn')
    expect(budgetStatus(10000, 10000)).toMatchObject({ level: 'warn', remainingCents: 0 })
  })
  it('is over above 100 % with a negative remainder', () => {
    expect(budgetStatus(12000, 10000)).toMatchObject({ level: 'over', remainingCents: -2000, ratio: 1.2 })
  })
  it('handles nothing spent', () => {
    expect(budgetStatus(0, 15000)).toMatchObject({ level: 'ok', remainingCents: 15000, ratio: 0 })
  })
})

describe('category budgets', () => {
  const cats = [
    { id: 1, type: 'expense' as const, budgetCents: 15000 },
    { id: 2, type: 'expense' as const }, // no budget
    { id: 3, type: 'expense' as const, budgetCents: 10000 },
    { id: 20, type: 'income' as const, budgetCents: 5 }, // budgets only apply to expense categories
  ]

  it('counts expenses only, never income', () => {
    const map = expensesByCategory([exp(1000, '2026-11-05', 1), exp(500, '2026-11-06', 1), inc(99999, '2026-11-01', 1)])
    expect(map.get(1)).toBe(1500)
  })

  it('reports only categories with a budget, including unused ones', () => {
    const res = categoryBudgetStatuses(cats, [exp(13000, '2026-11-05', 1), inc(50000)])
    expect(res.map((r) => [r.categoryId, r.spentCents, r.level])).toEqual([
      [1, 13000, 'warn'],
      [3, 0, 'ok'],
    ])
  })
})

describe('monthlySeries / totalBalance', () => {
  const entries = [
    inc(240000, '2026-09-01'),
    exp(100000, '2026-09-10'),
    inc(240000, '2026-10-01'),
    inc(10000, '2026-10-15'),
    exp(260000, '2026-10-20'),
    exp(5000, '2025-01-01'), // outside the range
  ]

  it('gives one point per requested month, in order, with zeros for empty months', () => {
    const s = monthlySeries(entries, ['2026-08', '2026-09', '2026-10'])
    expect(s).toEqual([
      { month: '2026-08', incomeCents: 0, expenseCents: 0, balanceCents: 0 },
      { month: '2026-09', incomeCents: 240000, expenseCents: 100000, balanceCents: 140000 },
      { month: '2026-10', incomeCents: 250000, expenseCents: 260000, balanceCents: -10000 },
    ])
  })

  it('totalBalance sums everything', () => {
    expect(totalBalance(entries)).toBe(240000 - 100000 + 250000 - 260000 - 5000)
  })
})
