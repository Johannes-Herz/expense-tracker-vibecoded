import { describe, expect, it } from 'vitest'
import type { Entry } from './finance'
import { trackedCategories, weekHasEntries, weekLevel, weekReports, weekState } from './weeklyBudgets'
import { weekSegments } from './weeks'

const groceries = { id: 1, type: 'expense', budgetCents: 30000, trackWeekly: true } as const // 300 € / 30 days = 10 €/day
const eatingOut = { id: 2, type: 'expense', budgetCents: 15000, trackWeekly: true } as const // 5 €/day
const noFlag = { id: 3, type: 'expense', budgetCents: 10000 } as const
const noBudget = { id: 4, type: 'expense', trackWeekly: true } as const
const income = { id: 5, type: 'income', budgetCents: 10000, trackWeekly: true } as const
const cats = [groceries, eatingOut, noFlag, noBudget, income]

const e = (date: string, amountCents: number, categoryId = 1, type: 'expense' | 'income' = 'expense'): Entry => ({ type, amountCents, categoryId, date })
const week = (_month: string, n: number) => (r: ReturnType<typeof weekReports>) => r.find((w) => w.segment.week === n)!

describe('trackedCategories', () => {
  it('needs expense type, a budget and the flag', () => {
    expect(trackedCategories(cats).map((c) => c.id)).toEqual([1, 2])
  })
})

describe('weekLevel / weekState', () => {
  it('over is certain; under only once the week is over; otherwise running', () => {
    expect(weekLevel(7001, 7000, 'current')).toBe('over')
    expect(weekLevel(7001, 7000, 'past')).toBe('over')
    expect(weekLevel(7000, 7000, 'past')).toBe('under') // exactly on budget is not over
    expect(weekLevel(100, 7000, 'past')).toBe('under')
    expect(weekLevel(100, 7000, 'current')).toBe('running')
    expect(weekLevel(0, 7000, 'future')).toBe('running')
  })

  it('classifies weeks against today', () => {
    const seg = weekSegments('2026-11')[2] // 9.–15. Nov
    expect(weekState(seg, '2026-11-08')).toBe('future')
    expect(weekState(seg, '2026-11-09')).toBe('current')
    expect(weekState(seg, '2026-11-15')).toBe('current')
    expect(weekState(seg, '2026-11-16')).toBe('past')
  })
})

describe('weekReports', () => {
  const today = '2026-11-14' // Saturday of KW 46
  const booked = [e('2026-11-10', 5000), e('2026-11-12', 2500), e('2026-11-03', 8000), e('2026-11-11', 999, 3), e('2026-11-11', 4000, 5, 'income')]
  const reports = weekReports('2026-11', cats, booked, [], today)

  it('only lists tracked categories and ignores income and untracked categories', () => {
    expect(week('2026-11', 46)(reports).items.map((i) => i.categoryId).sort()).toEqual([1, 2])
  })

  it('a full week has 7 days of the daily budget; running week stays neutral under budget', () => {
    const w = week('2026-11', 46)(reports)
    const g = w.items.find((i) => i.categoryId === 1)!
    expect(w.state).toBe('current')
    expect(g).toMatchObject({ budgetCents: 7000, spentCents: 7500, remainingCents: -500, level: 'over' })
    const o = w.items.find((i) => i.categoryId === 2)!
    expect(o).toMatchObject({ budgetCents: 3500, spentCents: 0, level: 'running' })
  })

  it('pro-rata budget for the days so far (current week only)', () => {
    const w = week('2026-11', 46)(reports)
    expect(w.items.find((i) => i.categoryId === 1)!.paceBudgetCents).toBe(6000) // Mon–Sat = 6 days
    const past = week('2026-11', 45)(reports)
    expect(past.items.find((i) => i.categoryId === 1)!.paceBudgetCents).toBe(7000)
  })

  it('past weeks get a final verdict; over-budget categories are listed first', () => {
    const w = week('2026-11', 45)(reports) // 2.–8. Nov: groceries 80 € of 70 €
    expect(w.state).toBe('past')
    expect(w.items.map((i) => [i.categoryId, i.level])).toEqual([[1, 'over'], [2, 'under']])
    const quiet = week('2026-11', 47)(weekReports('2026-11', cats, booked, [], '2026-11-30'))
    expect(quiet.items.every((i) => i.level === 'under')).toBe(true)
  })

  it('a split week only counts its own days and its own budget', () => {
    const nov = week('2026-11', 49)(weekReports('2026-11', cats, [e('2026-11-30', 900), e('2026-12-02', 5000)], [], '2026-12-10'))
    expect(nov.segment.days).toBe(1)
    expect(nov.items[0]).toMatchObject({ categoryId: 1, budgetCents: 1000, spentCents: 900, level: 'under' })
    const dec = week('2026-12', 49)(weekReports('2026-12', cats, [e('2026-11-30', 900), e('2026-12-02', 5000)], [], '2026-12-10'))
    expect(dec.segment.days).toBe(6)
    expect(dec.items.find((i) => i.categoryId === 1)).toMatchObject({ budgetCents: 5806, spentCents: 5000, level: 'under' }) // 300 € / 31 × 6, cumulative rounding
  })

  it('planned payments count toward spending and are reported separately', () => {
    const r = weekReports('2026-11', cats, [e('2026-11-10', 3000)], [e('2026-11-17', 7500)], today)
    const next = week('2026-11', 47)(r)
    expect(next.state).toBe('future')
    expect(next.items.find((i) => i.categoryId === 1)).toMatchObject({ spentCents: 7500, plannedCents: 7500, level: 'over' })
    const cur = week('2026-11', 46)(r).items.find((i) => i.categoryId === 1)!
    expect(cur).toMatchObject({ spentCents: 3000, plannedCents: 0, level: 'running' })
  })

  it('a zero weekly budget with spending is over, without spending not', () => {
    const tiny = [{ id: 9, type: 'expense', budgetCents: 1, trackWeekly: true } as const]
    const r = weekReports('2026-11', tiny, [e('2026-11-03', 1, 9)], [], '2026-11-30')
    const w = week('2026-11', 45)(r).items[0]
    expect(w.budgetCents).toBe(0)
    expect(w.level).toBe('over')
    expect(w.usedRatio).toBe(Infinity)
    expect(week('2026-11', 46)(r).items[0]).toMatchObject({ level: 'under', usedRatio: 0 })
  })

  it('no tracked categories gives weeks with no items', () => {
    expect(weekReports('2026-11', [noFlag], booked, [], today).every((w) => w.items.length === 0)).toBe(true)
  })

  it('weeks over a year boundary report with the right ISO year', () => {
    const r = weekReports('2027-01', cats, [e('2027-01-02', 1000)], [], '2027-01-31')
    expect(r[0].segment).toMatchObject({ isoYear: 2026, week: 53, days: 3 })
    expect(r[0].items.find((i) => i.categoryId === 1)).toMatchObject({ spentCents: 1000, budgetCents: 2903 }) // 300 € / 31 × 3
  })
})

describe('weekHasEntries', () => {
  it('checks the days of the segment', () => {
    const seg = weekSegments('2026-11')[1] // 2.–8. Nov
    expect(weekHasEntries(seg, [{ date: '2026-11-08' }])).toBe(true)
    expect(weekHasEntries(seg, [{ date: '2026-11-09' }])).toBe(false)
  })
})
