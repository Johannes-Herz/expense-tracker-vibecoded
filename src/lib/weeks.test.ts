import { describe, expect, it } from 'vitest'
import { addMonths } from './dates'
import { addDays, budgetForDays, budgetUntil, isoWeekOf, segmentOf, weekSegments, weekStartOf, weeklyBudgetCents } from './weeks'

describe('isoWeekOf / weekStartOf', () => {
  it('numbers ordinary weeks', () => {
    expect(isoWeekOf('2026-11-09')).toEqual({ year: 2026, week: 46 }) // Monday
    expect(isoWeekOf('2026-11-15')).toEqual({ year: 2026, week: 46 }) // Sunday
    expect(isoWeekOf('2026-11-16')).toEqual({ year: 2026, week: 47 })
  })

  it('handles the year boundary: KW 53 of 2026 reaches into January 2027', () => {
    expect(isoWeekOf('2026-12-28')).toEqual({ year: 2026, week: 53 })
    expect(isoWeekOf('2027-01-01')).toEqual({ year: 2026, week: 53 })
    expect(isoWeekOf('2027-01-03')).toEqual({ year: 2026, week: 53 })
    expect(isoWeekOf('2027-01-04')).toEqual({ year: 2027, week: 1 })
  })

  it('handles KW 1 starting in the old year', () => {
    expect(isoWeekOf('2024-12-30')).toEqual({ year: 2025, week: 1 })
    expect(isoWeekOf('2025-01-01')).toEqual({ year: 2025, week: 1 })
    expect(isoWeekOf('2021-01-03')).toEqual({ year: 2020, week: 53 })
  })

  it('finds the Monday', () => {
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09')
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09')
    expect(weekStartOf('2027-01-01')).toBe('2026-12-28')
  })

  it('is not affected by daylight-saving changes', () => {
    // DST starts Sun 29 Mar 2026 and ends Sun 25 Oct 2026 (Europe/Berlin)
    expect(isoWeekOf('2026-03-29')).toEqual({ year: 2026, week: 13 })
    expect(isoWeekOf('2026-03-30')).toEqual({ year: 2026, week: 14 })
    expect(isoWeekOf('2026-10-25')).toEqual({ year: 2026, week: 43 })
    expect(isoWeekOf('2026-10-26')).toEqual({ year: 2026, week: 44 })
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('weekSegments', () => {
  it('lists full weeks and splits the edge weeks by days (November 2026)', () => {
    const segs = weekSegments('2026-11')
    // 1 Nov 2026 is a Sunday, 30 Nov a Monday
    expect(segs.map((s) => [s.week, s.start, s.end, s.days, s.isSplit])).toEqual([
      [44, '2026-11-01', '2026-11-01', 1, true],
      [45, '2026-11-02', '2026-11-08', 7, false],
      [46, '2026-11-09', '2026-11-15', 7, false],
      [47, '2026-11-16', '2026-11-22', 7, false],
      [48, '2026-11-23', '2026-11-29', 7, false],
      [49, '2026-11-30', '2026-11-30', 1, true],
    ])
  })

  it('shows the other part of the split week in December', () => {
    const dec = weekSegments('2026-12')[0]
    expect(dec).toMatchObject({ week: 49, start: '2026-12-01', end: '2026-12-06', days: 6, isSplit: true })
  })

  it('a month starting on Monday and ending on Sunday has no split weeks (Feb 2027, 28 days)', () => {
    const segs = weekSegments('2027-02')
    expect(segs).toHaveLength(4)
    expect(segs.every((s) => s.days === 7 && !s.isSplit)).toBe(true)
  })

  it('covers every day of every month exactly once', () => {
    for (let m = '2024-01'; m <= '2028-12'; m = addMonths(m, 1)) {
      const total = weekSegments(m).reduce((sum, s) => sum + s.days, 0)
      const [y, mo] = m.split('-').map(Number)
      expect(total).toBe(new Date(Date.UTC(y, mo, 0)).getUTCDate())
    }
  })

  it('handles the year boundary in January and December', () => {
    const jan = weekSegments('2027-01')[0]
    expect(jan).toMatchObject({ isoYear: 2026, week: 53, start: '2027-01-01', end: '2027-01-03', days: 3, isSplit: true })
    const dec = weekSegments('2026-12').at(-1)!
    expect(dec).toMatchObject({ isoYear: 2026, week: 53, start: '2026-12-28', end: '2026-12-31', days: 4, isSplit: true })
    const next = weekSegments('2027-01')[1]
    expect(next).toMatchObject({ isoYear: 2027, week: 1, start: '2027-01-04' })
  })

  it('keys are unique and a split week has different keys in the two months', () => {
    const keys = [...weekSegments('2026-11'), ...weekSegments('2026-12')].map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('works across the DST changes', () => {
    const march = weekSegments('2026-03')
    expect(march.find((s) => s.week === 13)).toMatchObject({ start: '2026-03-23', end: '2026-03-29', days: 7 })
    const oct = weekSegments('2026-10')
    expect(oct.find((s) => s.week === 43)).toMatchObject({ start: '2026-10-19', end: '2026-10-25', days: 7 })
  })

  it('segmentOf finds the segment of a date', () => {
    expect(segmentOf('2026-11', '2026-11-30')?.week).toBe(49)
    expect(segmentOf('2026-11', '2026-12-01')).toBeUndefined()
  })
})

describe('weekly budgets (cents)', () => {
  it('full week = 7 days of the daily budget, split week only its days', () => {
    // 300 € in a 30-day month: exactly 10 € per day
    expect(weeklyBudgetCents(30000, weekSegments('2026-11')[2])).toBe(7000)
    expect(weeklyBudgetCents(30000, weekSegments('2026-11')[5])).toBe(1000) // 30 Nov, 1 day
    expect(weeklyBudgetCents(31000, weekSegments('2026-12')[0])).toBe(6000) // 1–6 Dec, 6 days of 31
  })

  it('weekly budgets of a month add up exactly to the monthly budget (28/29/30/31 days, odd amounts)', () => {
    const months = ['2027-02', '2028-02', '2026-04', '2026-05', '2026-11', '2026-12', '2027-01']
    const budgets = [1, 99, 100, 1234, 10000, 15000, 33333, 99999, 123457]
    for (const month of months) {
      for (const monthly of budgets) {
        const segs = weekSegments(month)
        const parts = segs.map((s) => weeklyBudgetCents(monthly, s))
        expect(parts.reduce((a, b) => a + b, 0)).toBe(monthly)
        expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true)
      }
    }
  })

  it('each part is within one cent of its exact share', () => {
    const monthly = 10000 // 100 € over 31 days
    for (const seg of weekSegments('2026-12')) {
      const exact = (monthly * seg.days) / 31
      expect(Math.abs(weeklyBudgetCents(monthly, seg) - exact)).toBeLessThan(1)
    }
  })

  it('distributes leftover cents instead of putting them all on one week (100 € in a 31-day month)', () => {
    const parts = weekSegments('2026-12').map((s) => weeklyBudgetCents(10000, s))
    expect(parts).toEqual([1935, 2258, 2258, 2258, 1291]) // 6, 7, 7, 7, 4 days; sum 10000
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('budgetForDays covers the whole month and an empty range is 0', () => {
    expect(budgetForDays(12345, '2026-02', 1, 28)).toBe(12345)
    expect(budgetForDays(12345, '2028-02', 1, 29)).toBe(12345)
    expect(budgetForDays(12345, '2026-02', 5, 4)).toBe(0)
  })

  it('pro-rata budget for the days so far', () => {
    const seg = weekSegments('2026-11')[2] // 9.–15. Nov, 7000 of 30000
    expect(budgetUntil(30000, seg, '2026-11-08')).toBe(0) // before the week
    expect(budgetUntil(30000, seg, '2026-11-09')).toBe(1000)
    expect(budgetUntil(30000, seg, '2026-11-11')).toBe(3000)
    expect(budgetUntil(30000, seg, '2026-11-20')).toBe(7000) // after the week = full
  })
})
