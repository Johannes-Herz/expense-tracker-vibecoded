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
  const item = (r: ReturnType<typeof weekReports>, n: number, id = 1) => week('2026-11', n)(r).items.find((i) => i.categoryId === id)!

  it('only lists tracked categories and ignores income and untracked categories', () => {
    expect(week('2026-11', 46)(reports).items.map((i) => i.categoryId).sort()).toEqual([1, 2])
  })

  it('a full week has 7 days of the daily budget; running week stays neutral under budget', () => {
    const w = week('2026-11', 46)(reports)
    expect(w.state).toBe('current')
    // 8000 (day 1–8) spent = 8000 budgeted: no carry. Then 7500 spent against 7000 of this week.
    expect(item(reports, 46)).toMatchObject({
      budgetCents: 7000, carryCents: 0, availableCents: 7000, spentCents: 7500,
      cumBudgetCents: 15000, cumSpentCents: 15500, remainingCents: -500, level: 'over',
    })
    expect(item(reports, 46, 2)).toMatchObject({ budgetCents: 3500, carryCents: 4000, spentCents: 0, level: 'running' })
  })

  it('pro-rata budget = budget of all days from the 1st up to today (current week only)', () => {
    expect(item(reports, 46).paceBudgetCents).toBe(14000) // 1.–14. Nov
    expect(item(reports, 45).paceBudgetCents).toBe(8000) // past week = cumulative budget at its end
  })

  it('a bulk shop covering more than one week is not overspending (leftover carries forward)', () => {
    const r = weekReports('2026-11', cats, [e('2026-11-10', 12000)], [], '2026-11-30')
    // Week 46 (9.–15.): own share 70 €, but 80 € left over from days 1–8 -> 150 € available, 120 € spent
    expect(item(r, 46)).toMatchObject({ budgetCents: 7000, carryCents: 8000, availableCents: 15000, spentCents: 12000, level: 'under' })
    // Week 47: the carry is now 30 € (150 − 120)
    expect(item(r, 47)).toMatchObject({ carryCents: 3000, availableCents: 10000, spentCents: 0, level: 'under' })
  })

  it('overspending carries forward too and recovers once the budget catches up', () => {
    const r = weekReports('2026-11', [groceries], [e('2026-11-03', 20000)], [], '2026-11-30')
    const levels = [44, 45, 46, 47, 48, 49].map((n) => [n, item(r, n).level])
    // 200 € spent on day 3: over until the cumulative budget reaches 200 € (day 20), so weeks 45 and 46 are red;
    // week 47 (days 16–22, 220 € cumulative) is back in budget. Week 49 contains "today": still open.
    expect(levels).toEqual([[44, 'under'], [45, 'over'], [46, 'over'], [47, 'under'], [48, 'under'], [49, 'running']])
    expect(item(r, 46)).toMatchObject({ carryCents: -12000, availableCents: -5000, remainingCents: -5000 })
    expect(item(r, 47).remainingCents).toBe(22000 - 20000)
  })

  it('a bulk shop in the very first days is still over (no borrowing from future weeks)', () => {
    const r = weekReports('2026-11', [groceries], [e('2026-11-02', 12000)], [], '2026-11-30')
    expect(item(r, 45).level).toBe('over') // 120 € vs 80 € so far
    expect(item(r, 46).level).toBe('under') // 150 € budget by day 15 covers it
  })

  it('past weeks get a final verdict; exactly on the running balance is not over', () => {
    const w = week('2026-11', 45)(reports) // 2.–8. Nov: groceries 80 € of 80 € cumulative
    expect(w.state).toBe('past')
    expect(w.items.map((i) => [i.categoryId, i.level])).toEqual([[1, 'under'], [2, 'under']])
    const more = weekReports('2026-11', cats, [...booked, e('2026-11-05', 1)], [], today)
    expect(week('2026-11', 45)(more).items.map((i) => [i.categoryId, i.level])).toEqual([[1, 'over'], [2, 'under']])
  })

  it('the last week of a month gives the same verdict as the monthly budget', () => {
    for (const month of ['2026-02', '2028-02', '2026-04', '2026-11', '2026-12', '2027-01']) {
      for (const monthly of [1, 999, 10000, 33333]) {
        const cat = [{ id: 1, type: 'expense', budgetCents: monthly, trackWeekly: true } as const]
        for (const spent of [0, monthly - 1, monthly, monthly + 1]) {
          const last = weekReports(month, cat, [e(`${month}-02`, spent)], [], '2030-01-01').at(-1)!.items[0]
          expect(last.cumBudgetCents).toBe(monthly)
          expect(last.level).toBe(spent > monthly ? 'over' : 'under')
        }
      }
    }
  })

  it('available = own share + carry = cumulative budget − spending before the week', () => {
    const r = weekReports('2026-12', [groceries], [e('2026-12-02', 3000), e('2026-12-09', 500), e('2026-12-30', 700)], [], '2026-12-31')
    let before = 0
    for (const w of r) {
      const i = w.items[0]
      expect(i.availableCents).toBe(i.cumBudgetCents - before)
      expect(i.cumSpentCents).toBe(before + i.spentCents)
      before = i.cumSpentCents
    }
    expect(r.reduce((sum, w) => sum + w.items[0].budgetCents, 0)).toBe(30000)
  })

  it('a split week only counts its own days; the balance starts fresh in the new month', () => {
    const entries = [e('2026-11-30', 900), e('2026-12-02', 5000)]
    const nov = item(weekReports('2026-11', cats, entries, [], '2026-12-10'), 49)
    expect(nov).toMatchObject({ budgetCents: 1000, spentCents: 900, carryCents: 29000, level: 'under' })
    const dec = item(weekReports('2026-12', cats, entries, [], '2026-12-10'), 49)
    expect(dec).toMatchObject({ budgetCents: 5806, carryCents: 0, spentCents: 5000, level: 'under' }) // 30 Nov is not in December
  })

  it('planned payments count toward spending and are reported separately', () => {
    const r = weekReports('2026-11', cats, [e('2026-11-10', 3000)], [e('2026-11-17', 20000)], today)
    const next = item(r, 47)
    expect(week('2026-11', 47)(r).state).toBe('future')
    expect(next).toMatchObject({ spentCents: 20000, plannedCents: 20000, cumSpentCents: 23000, cumBudgetCents: 22000, level: 'over' })
    expect(item(r, 46)).toMatchObject({ spentCents: 3000, plannedCents: 0, level: 'running' })
  })

  it('a week with a 0-cent share is judged by the carry, not just its own share', () => {
    const tiny = [{ id: 9, type: 'expense', budgetCents: 1, trackWeekly: true } as const]
    const r = weekReports('2026-11', tiny, [e('2026-11-03', 1, 9)], [], '2026-12-05')
    expect(item(r, 45, 9)).toMatchObject({ budgetCents: 0, level: 'over', usedRatio: Infinity })
    expect(item(r, 46, 9)).toMatchObject({ carryCents: -1, level: 'over' }) // the debt is carried
    expect(item(r, 49, 9)).toMatchObject({ cumBudgetCents: 1, level: 'under' }) // the 1 cent of the month arrives on day 30
    const none = weekReports('2026-11', tiny, [], [], '2026-12-05')
    expect(item(none, 46, 9)).toMatchObject({ level: 'under', usedRatio: 0 })
  })

  it('no tracked categories gives weeks with no items', () => {
    expect(weekReports('2026-11', [noFlag], booked, [], today).every((w) => w.items.length === 0)).toBe(true)
  })

  it('weeks over a year boundary report with the right ISO year', () => {
    const r = weekReports('2027-01', cats, [e('2027-01-02', 1000)], [], '2027-01-31')
    expect(r[0].segment).toMatchObject({ isoYear: 2026, week: 53, days: 3 })
    expect(item(r, 53)).toMatchObject({ spentCents: 1000, budgetCents: 2903 }) // 300 € / 31 × 3
  })
})

describe('weekHasEntries', () => {
  it('checks the days of the segment', () => {
    const seg = weekSegments('2026-11')[1] // 2.–8. Nov
    expect(weekHasEntries(seg, [{ date: '2026-11-08' }])).toBe(true)
    expect(weekHasEntries(seg, [{ date: '2026-11-09' }])).toBe(false)
  })
})
