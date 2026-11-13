import { describe, expect, it } from 'vitest'
import type { RecurringExpense } from '../db'
import { bookedKey, plannedForMonth, plannedOccurrences, planningEnd } from './planned'
import { planGeneration } from './recurrence'

let nextId = 1
const series = (over: Partial<RecurringExpense> = {}): RecurringExpense => ({
  id: nextId++,
  type: 'expense',
  amountCents: 1000,
  categoryId: 1,
  frequency: 'monthly',
  interval: 1,
  startDate: '2026-01-15',
  paused: false,
  generatedThrough: '2026-11-13',
  createdAt: 0,
  ...over,
})
const dates = (list: { date: string }[]) => list.map((p) => p.date)

describe('planningEnd', () => {
  it('is the last day of the month `monthsAhead` after today', () => {
    expect(planningEnd('2026-11-13', 0)).toBe('2026-11-30')
    expect(planningEnd('2026-11-13', 1)).toBe('2026-12-31')
    expect(planningEnd('2026-12-20', 1)).toBe('2027-01-31')
    expect(planningEnd('2027-01-31', 1)).toBe('2027-02-28')
    expect(planningEnd('2027-11-13', 3)).toBe('2028-02-29')
  })
})

describe('plannedOccurrences', () => {
  it('plans the rest of this month and next month, not today or the past', () => {
    const s = series({ startDate: '2026-01-20' })
    expect(dates(plannedOccurrences([s], '2026-11-13'))).toEqual(['2026-11-20', '2026-12-20'])
  })

  it('does not plan an occurrence that is today (generation books it)', () => {
    const s = series({ startDate: '2026-01-13', generatedThrough: '2026-11-12' })
    expect(dates(plannedOccurrences([s], '2026-11-13'))).toEqual(['2026-12-13'])
  })

  it('handles month boundaries (late December into January)', () => {
    const s = series({ startDate: '2026-01-05', generatedThrough: '2026-12-20' })
    expect(dates(plannedOccurrences([s], '2026-12-20'))).toEqual(['2027-01-05'])
  })

  it('clamps the 31st to the last day of shorter months', () => {
    const s = series({ startDate: '2026-01-31', generatedThrough: '2027-01-20' })
    expect(dates(plannedOccurrences([s], '2027-01-20'))).toEqual(['2027-01-31', '2027-02-28'])
  })

  it('moves 29 Feb to 28 Feb in non-leap years', () => {
    const s = series({ frequency: 'yearly', startDate: '2024-02-29', generatedThrough: '2027-02-10' })
    expect(dates(plannedOccurrences([s], '2027-02-10', 0))).toEqual(['2027-02-28'])
  })

  it('plans nothing for paused series', () => {
    expect(plannedOccurrences([series({ paused: true })], '2026-11-13')).toEqual([])
  })

  it('stops at the end date (inclusive)', () => {
    const s = series({ startDate: '2026-01-20', endDate: '2026-11-20' })
    expect(dates(plannedOccurrences([s], '2026-11-13'))).toEqual(['2026-11-20'])
    const ended = series({ startDate: '2026-01-20', endDate: '2026-11-10' })
    expect(plannedOccurrences([ended], '2026-11-13')).toEqual([])
  })

  it('plans a series that starts in the future from its start date', () => {
    const s = series({ startDate: '2026-12-02', generatedThrough: undefined })
    expect(dates(plannedOccurrences([s], '2026-11-13'))).toEqual(['2026-12-02'])
    const later = series({ startDate: '2027-03-01', generatedThrough: undefined })
    expect(plannedOccurrences([later], '2026-11-13')).toEqual([])
  })

  it('supports weekly, daily and intervals > 1', () => {
    const weekly = series({ frequency: 'weekly', startDate: '2026-11-02', generatedThrough: '2026-11-13' })
    expect(dates(plannedOccurrences([weekly], '2026-11-13', 0))).toEqual(['2026-11-16', '2026-11-23', '2026-11-30'])
    const daily = series({ frequency: 'daily', startDate: '2026-11-01', generatedThrough: '2026-11-13' })
    expect(plannedOccurrences([daily], '2026-11-13', 0)).toHaveLength(17)
    const bimonthly = series({ interval: 2, startDate: '2026-09-20', generatedThrough: '2026-11-13' })
    expect(dates(plannedOccurrences([bimonthly], '2026-11-13'))).toEqual(['2026-11-20'])
  })

  it('respects the horizon', () => {
    const s = series({ startDate: '2026-01-20' })
    expect(dates(plannedOccurrences([s], '2026-11-13', 0))).toEqual(['2026-11-20'])
    expect(dates(plannedOccurrences([s], '2026-11-13', 3))).toEqual(['2026-11-20', '2026-12-20', '2027-01-20', '2027-02-20'])
  })

  it('never plans occurrences at or before the cursor (e.g. a deleted booked one)', () => {
    const s = series({ startDate: '2026-01-20', generatedThrough: '2026-11-25' })
    expect(dates(plannedOccurrences([s], '2026-11-13'))).toEqual(['2026-12-20'])
  })

  it('drops occurrences that already exist as booked entries', () => {
    const s = series({ startDate: '2026-01-20' })
    const booked = new Set([bookedKey(s.id, '2026-11-20')])
    expect(dates(plannedOccurrences([s], '2026-11-13', 1, booked))).toEqual(['2026-12-20'])
  })

  it('carries type, amount, category and note; sorts by date', () => {
    const a = series({ type: 'income', amountCents: 240000, categoryId: 11, note: 'Gehalt', startDate: '2026-01-28' })
    const b = series({ startDate: '2026-01-02' })
    const list = plannedOccurrences([a, b], '2026-11-13', 0)
    expect(list.map((p) => [p.type, p.amountCents, p.categoryId, p.note, p.date])).toEqual([
      ['income', 240000, 11, 'Gehalt', '2026-11-28'],
    ])
    expect(dates(plannedOccurrences([a, b], '2026-11-13'))).toEqual(['2026-11-28', '2026-12-02', '2026-12-28'])
  })
})

describe('plannedForMonth', () => {
  it('filters by month', () => {
    const list = plannedOccurrences([series({ startDate: '2026-01-20' })], '2026-11-13')
    expect(dates(plannedForMonth(list, '2026-12'))).toEqual(['2026-12-20'])
    expect(plannedForMonth(list, '2027-01')).toEqual([])
  })
})

describe('no double counting when the day arrives', () => {
  it('an occurrence is planned the day before and booked (not planned) on the day', () => {
    const s = series({ startDate: '2026-01-20', generatedThrough: '2026-11-19' })
    expect(dates(plannedOccurrences([s], '2026-11-19', 0))).toEqual(['2026-11-20'])
    // On the 20th generation books it and the cursor moves to the 20th
    const { occurrences, newCursor } = planGeneration(s, '2026-11-20')
    expect(occurrences).toEqual(['2026-11-20'])
    const after = { ...s, generatedThrough: newCursor }
    expect(plannedOccurrences([after], '2026-11-20', 0)).toEqual([])
    // Running generation again books nothing more
    expect(planGeneration(after, '2026-11-20').occurrences).toEqual([])
  })
})
