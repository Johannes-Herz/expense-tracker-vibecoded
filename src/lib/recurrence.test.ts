import { describe, expect, it } from 'vitest'
import {
  addDays,
  cursorOnResume,
  initialCursor,
  occurrenceDate,
  occurrencesBetween,
  planGeneration,
  type SeriesState,
} from './recurrence'

const monthly = (startDate: string, interval = 1, endDate?: string) =>
  ({ frequency: 'monthly', interval, startDate, endDate }) as const

describe('occurrenceDate', () => {
  it('clamps monthly on the 31st to the end of shorter months without drifting', () => {
    const s = monthly('2025-01-31')
    expect([0, 1, 2, 3].map((n) => occurrenceDate(s, n))).toEqual(['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30'])
    expect(occurrenceDate(monthly('2024-01-31'), 1)).toBe('2024-02-29') // leap year
  })

  it('handles yearly on 29 February', () => {
    const s = { frequency: 'yearly', interval: 1, startDate: '2024-02-29' } as const
    expect([0, 1, 2, 3, 4].map((n) => occurrenceDate(s, n))).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
    ])
  })

  it('supports intervals: every 3 months across a year end, every 2 weeks, every 2 years', () => {
    expect(occurrenceDate(monthly('2025-11-15', 3), 1)).toBe('2026-02-15')
    expect(occurrenceDate({ frequency: 'weekly', interval: 2, startDate: '2026-01-01' }, 2)).toBe('2026-01-29')
    expect(occurrenceDate({ frequency: 'yearly', interval: 2, startDate: '2026-05-10' }, 1)).toBe('2028-05-10')
  })

  it('is not affected by daylight saving time changes', () => {
    const s = { frequency: 'weekly', interval: 1, startDate: '2026-03-22' } as const // DST starts 2026-03-29 in Europe
    expect([0, 1, 2].map((n) => occurrenceDate(s, n))).toEqual(['2026-03-22', '2026-03-29', '2026-04-05'])
    const d = { frequency: 'daily', interval: 1, startDate: '2026-10-24' } as const // DST ends 2026-10-25
    expect([0, 1, 2, 3].map((n) => occurrenceDate(d, n))).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
  })
})

describe('occurrencesBetween', () => {
  it('respects the end date (inclusive) and the cursor (exclusive)', () => {
    const s = monthly('2026-01-01', 1, '2026-03-01')
    expect(occurrencesBetween(s, undefined, '2026-12-31')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    expect(occurrencesBetween(s, '2026-01-01', '2026-12-31')).toEqual(['2026-02-01', '2026-03-01'])
  })

  it('returns nothing for a start date in the future', () => {
    expect(occurrencesBetween(monthly('2027-01-01'), undefined, '2026-11-12')).toEqual([])
  })

  it('includes today', () => {
    expect(occurrencesBetween(monthly('2026-11-12'), undefined, '2026-11-12')).toEqual(['2026-11-12'])
  })
})

describe('planGeneration', () => {
  const series = (over: Partial<SeriesState> = {}): SeriesState => ({ ...monthly('2026-08-01'), paused: false, ...over })

  it('backfills all past occurrences on the first run', () => {
    const plan = planGeneration(series(), '2026-11-12')
    expect(plan.occurrences).toEqual(['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'])
    expect(plan.newCursor).toBe('2026-11-12')
  })

  it('is idempotent: a second run on the same day creates nothing', () => {
    const plan = planGeneration(series({ generatedThrough: '2026-11-12' }), '2026-11-12')
    expect(plan.occurrences).toEqual([])
  })

  it('catches up only what was missed since the last run', () => {
    const plan = planGeneration(series({ generatedThrough: '2026-09-20' }), '2026-12-02')
    expect(plan.occurrences).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])
  })

  it('never moves the cursor backwards if the device date goes back', () => {
    const plan = planGeneration(series({ generatedThrough: '2026-11-12' }), '2026-11-10')
    expect(plan.occurrences).toEqual([])
    expect(plan.newCursor).toBe('2026-11-12')
  })

  it('does not recreate occurrences before the cursor after the schedule was changed', () => {
    // user moved the start date back to 2026-01-15; everything <= cursor stays untouched
    const plan = planGeneration(series({ startDate: '2026-01-15', generatedThrough: '2026-11-12' }), '2026-12-20')
    expect(plan.occurrences).toEqual(['2026-11-15', '2026-12-15'])
  })

  it('creates nothing while paused and keeps the cursor', () => {
    const plan = planGeneration(series({ paused: true, generatedThrough: '2026-09-01' }), '2026-11-12')
    expect(plan).toEqual({ occurrences: [], newCursor: '2026-09-01' })
  })
})

describe('cursors', () => {
  it('without backfill, only today and later are created', () => {
    const cursor = initialCursor(false, '2026-11-12')
    expect(cursor).toBe('2026-11-11')
    const plan = planGeneration({ ...monthly('2026-08-01'), paused: false, generatedThrough: cursor }, '2026-12-01')
    expect(plan.occurrences).toEqual(['2026-12-01'])
    expect(initialCursor(true, '2026-11-12')).toBeUndefined()
  })

  it('resuming skips the paused period', () => {
    const cursor = cursorOnResume('2026-09-01', '2026-11-12')
    expect(cursor).toBe('2026-11-11')
    expect(planGeneration({ ...monthly('2026-08-01'), paused: false, generatedThrough: cursor }, '2026-11-12').occurrences).toEqual([])
    expect(cursorOnResume('2026-11-12', '2026-11-12')).toBe('2026-11-12')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
