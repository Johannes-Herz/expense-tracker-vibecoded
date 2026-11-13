import { describe, expect, it } from 'vitest'
import {
  categorySeries,
  categoryTrend,
  computeTrends,
  dayLimitFor,
  hasEnoughHistory,
  previousMonths,
  sumInMonth,
  type TrendCategory,
  type TrendEntry,
  type TrendOptions,
} from './trends'

const exp = (amountCents: number, date: string, categoryId = 1, recurringId?: number): TrendEntry => ({
  type: 'expense',
  amountCents,
  date,
  categoryId,
  recurringId,
})
const cat = (id: number, extra: Partial<TrendCategory> = {}): TrendCategory => ({ id, type: 'expense', ...extra })

// Reference: November 2026 is over (past month), so full months are compared.
const base: TrendOptions = {
  refMonth: '2026-11',
  avgMonths: 3,
  thresholdPct: 10,
  today: '2026-12-15',
  includeFixed: true,
  firstEntryMonth: '2025-01',
}

describe('helpers', () => {
  it('previousMonths gives the n months before, oldest first', () => {
    expect(previousMonths('2026-02', 3)).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  it('dayLimitFor only limits the current month', () => {
    expect(dayLimitFor('2026-11', '2026-11-13')).toBe(13)
    expect(dayLimitFor('2026-10', '2026-11-13')).toBeUndefined()
  })

  it('sumInMonth caps the day to the month length (31 → 28 in Feb)', () => {
    const list = [exp(100, '2027-02-27'), exp(200, '2027-02-28'), exp(400, '2027-03-01')]
    expect(sumInMonth(list, '2027-02', 31)).toBe(300)
    expect(sumInMonth(list, '2027-02', 27)).toBe(100)
    expect(sumInMonth(list, '2027-02')).toBe(300)
  })

  it('hasEnoughHistory needs data back to the first month of the window', () => {
    expect(hasEnoughHistory('2026-11', 3, '2026-08')).toBe(true)
    expect(hasEnoughHistory('2026-11', 3, '2026-09')).toBe(false)
    expect(hasEnoughHistory('2026-11', 3, undefined)).toBe(false)
  })
})

describe('categoryTrend', () => {
  it('rises above +threshold, falls below −threshold, else stable', () => {
    expect(categoryTrend(31000, 24000, 10, true)).toMatchObject({ status: 'up' })
    expect(categoryTrend(19500, 23000, 10, true)).toMatchObject({ status: 'down' })
    expect(categoryTrend(23500, 23000, 10, true)).toMatchObject({ status: 'stable' })
  })

  it('exactly at the threshold is stable, just beyond is not', () => {
    expect(categoryTrend(11000, 10000, 10, true).status).toBe('stable')
    expect(categoryTrend(9000, 10000, 10, true).status).toBe('stable')
    expect(categoryTrend(11001, 10000, 10, true).status).toBe('up')
    expect(categoryTrend(8999, 10000, 10, true).status).toBe('down')
  })

  it('reports the unrounded percentage', () => {
    expect(categoryTrend(31000, 24000, 10, true).pct).toBeCloseTo(29.1667, 3)
    expect(categoryTrend(0, 10000, 10, true)).toEqual({ status: 'down', pct: -100 })
  })

  it('handles an average of 0 without dividing', () => {
    expect(categoryTrend(5000, 0, 10, true)).toEqual({ status: 'new', pct: null })
    expect(categoryTrend(0, 0, 10, true)).toEqual({ status: 'stable', pct: 0 })
  })

  it('shows "insufficient" without enough history, whatever the numbers are', () => {
    expect(categoryTrend(5000, 0, 10, false)).toEqual({ status: 'insufficient', pct: null })
    expect(categoryTrend(31000, 24000, 10, false)).toEqual({ status: 'insufficient', pct: null })
  })

  it('respects a custom threshold', () => {
    expect(categoryTrend(12000, 10000, 25, true).status).toBe('stable')
    expect(categoryTrend(12000, 10000, 5, true).status).toBe('up')
  })
})

describe('computeTrends – past month (full months)', () => {
  const entries = [
    // Aug–Oct (the 3 months before November): 200, 250, 240 → average 230
    exp(20000, '2026-08-10'),
    exp(25000, '2026-09-10'),
    exp(24000, '2026-10-10'),
    exp(31000, '2026-11-20'), // November: 310 → +34.8 %
    // Category 2: stays about the same
    exp(10000, '2026-08-05', 2),
    exp(10000, '2026-09-05', 2),
    exp(10000, '2026-10-05', 2),
    exp(10500, '2026-11-05', 2),
  ]

  it('compares the month with the average of the N full months before it (not including itself)', () => {
    const [first, second] = computeTrends(entries, [cat(1), cat(2)], base)
    expect(first.category.id).toBe(1)
    expect(first.currentCents).toBe(31000)
    expect(first.avgCents).toBe(23000)
    expect(first.status).toBe('up')
    expect(first.pct).toBeCloseTo(34.78, 1)
    expect(second.status).toBe('stable')
  })

  it('a longer average period changes the baseline', () => {
    const more = [...entries, exp(50000, '2026-05-10')] // only inside a 6 month window
    const [row] = computeTrends(more, [cat(1)], { ...base, avgMonths: 6 })
    expect(row.avgCents).toBe(Math.round((50000 + 20000 + 25000 + 24000) / 6))
  })

  it('builds a 6 month sparkline ending with the reference month', () => {
    const [row] = computeTrends(entries, [cat(1)], base)
    expect(row.spark).toEqual([0, 0, 20000, 25000, 24000, 31000])
    expect(row.sparkPartial).toBe(false)
  })

  it('sorts by change, biggest increase first; "new" before, "insufficient" last', () => {
    const list = [
      ...entries,
      exp(5000, '2026-11-02', 3), // category 3 had nothing before → "new"
      exp(5000, '2026-08-02', 4), // category 4: 50 → 0 → down
    ]
    const rows = computeTrends(list, [cat(1), cat(2), cat(3), cat(4)], base)
    expect(rows.map((r) => [r.category.id, r.status])).toEqual([
      [3, 'new'],
      [1, 'up'],
      [2, 'stable'],
      [4, 'down'],
    ])
    const insufficient = computeTrends(list, [cat(1), cat(3)], { ...base, firstEntryMonth: '2026-10' })
    expect(insufficient.every((r) => r.status === 'insufficient')).toBe(true)
  })

  it('hides income categories, hidden categories and categories without any spending', () => {
    const rows = computeTrends(entries, [cat(1), cat(2, { hideFromTrends: true }), cat(5), { id: 6, type: 'income' as const }], base)
    expect(rows.map((r) => r.category.id)).toEqual([1])
  })

  it('keeps a category that only spent earlier in the window (now 0 → −100 %)', () => {
    const rows = computeTrends([exp(10000, '2026-09-01', 7)], [cat(7)], base)
    expect(rows[0]).toMatchObject({ currentCents: 0, status: 'down', pct: -100 })
  })

  it('ignores income entries', () => {
    const rows = computeTrends([{ ...exp(99999, '2026-11-03'), type: 'income' as const }], [cat(1)], base)
    expect(rows).toEqual([])
  })
})

describe('computeTrends – current month (month-to-date, like-for-like)', () => {
  const opts: TrendOptions = { ...base, refMonth: '2026-11', today: '2026-11-13' }
  const entries = [
    // Previous months: 100 € in the first 13 days and 300 € after → full months would be 400 €
    exp(10000, '2026-08-05'), exp(30000, '2026-08-20'),
    exp(10000, '2026-09-05'), exp(30000, '2026-09-20'),
    exp(10000, '2026-10-05'), exp(30000, '2026-10-20'),
    exp(11000, '2026-11-05'), // November until the 13th: 110 €
    exp(99900, '2026-11-14'), // in the "future" of the day range: not counted yet
  ]

  it('compares up to today\'s day with the same day range of the previous months', () => {
    const [row] = computeTrends(entries, [cat(1)], opts)
    expect(row.currentCents).toBe(11000)
    expect(row.avgCents).toBe(10000)
    expect(row.status).toBe('stable') // +10 % exactly
    expect(row.sparkPartial).toBe(true)
    expect(row.spark.at(-1)).toBe(11000)
    expect(row.spark.at(-2)).toBe(40000) // earlier bars are full months
  })

  it('would wrongly look like a big drop when compared with full months', () => {
    const fullMonthAvg = 40000
    expect(categoryTrend(11000, fullMonthAvg, 10, true).status).toBe('down')
  })

  it('caps the day for short months (today is the 31st, February has 28 days)', () => {
    const rows = computeTrends(
      [exp(10000, '2027-02-28'), exp(10000, '2027-03-31')],
      [cat(1)],
      { ...opts, refMonth: '2027-03', today: '2027-03-31', avgMonths: 3, firstEntryMonth: '2026-12' },
    )
    expect(rows[0].currentCents).toBe(10000)
    expect(rows[0].avgCents).toBe(Math.round(10000 / 3)) // Feb counted fully (28th is its last day)
  })
})

describe('fixed costs filter', () => {
  const entries = [
    exp(72000, '2026-09-01', 1, 5), exp(72000, '2026-10-01', 1, 5), exp(72000, '2026-11-01', 1, 5), exp(80000, '2026-08-01', 1, 5),
    exp(5000, '2026-09-10', 1), exp(5000, '2026-10-10', 1), exp(9000, '2026-11-10', 1), exp(5000, '2026-08-10', 1),
  ]

  it('includes them by default and leaves them out when switched off', () => {
    const [withFixed] = computeTrends(entries, [cat(1)], base)
    const [without] = computeTrends(entries, [cat(1)], { ...base, includeFixed: false })
    expect(withFixed.currentCents).toBe(81000)
    expect(without.currentCents).toBe(9000)
    expect(without.status).toBe('up')
  })
})

describe('categorySeries', () => {
  it('returns 12 months, the average and marks a partial current month', () => {
    const entries = [exp(10000, '2026-09-01'), exp(20000, '2026-10-01'), exp(30000, '2026-11-02'), exp(99000, '2026-11-20')]
    const s = categorySeries(entries, 1, { refMonth: '2026-11', avgMonths: 3, today: '2026-11-13', includeFixed: true })
    expect(s.months).toHaveLength(12)
    expect(s.months[0]).toBe('2025-12')
    expect(s.months.at(-1)).toBe('2026-11')
    expect(s.values.slice(-3)).toEqual([10000, 20000, 30000])
    expect(s.avgCents).toBe(10000) // (0 + 10000 + 20000) / 3
    expect(s.partialLast).toBe(true)
  })
})
