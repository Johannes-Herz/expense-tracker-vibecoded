// "Planned" entries: recurring occurrences that are due later but not booked yet.
// They are computed on the fly from the series definitions and never stored, so editing, pausing
// or deleting a series needs no clean-up and exports can never contain them.
import type { EntryType, RecurringExpense } from '../db'
import { addMonths, daysInMonth, monthOf } from './dates'
import { occurrencesBetween } from './recurrence'

/** Planned entries are shown for the current month plus this many months ahead (fixed for now). */
export const PLANNING_MONTHS_AHEAD = 1

export interface PlannedEntry {
  key: string // `${seriesId}:${date}`, same format as bookedKey()
  seriesId: number
  type: EntryType
  amountCents: number
  categoryId: number
  date: string // "YYYY-MM-DD"
  note?: string
  planned: true
}

/** Key identifying one occurrence of one series (matches the [recurringId+occurrenceDate] index). */
export const bookedKey = (seriesId: number, occurrenceDate: string) => `${seriesId}:${occurrenceDate}`

/** Last day of the planning window: end of the month `monthsAhead` after today's month. */
export function planningEnd(today: string, monthsAhead: number = PLANNING_MONTHS_AHEAD): string {
  const month = addMonths(monthOf(today), monthsAhead)
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
}

/**
 * Occurrences after today (and after the series' cursor) up to the end of the planning window.
 * Booked expenses only ever carry dates up to today, so these never overlap with real entries;
 * `booked` additionally drops any occurrence that already exists as a real entry.
 * Paused series plan nothing; end dates and future start dates follow the normal schedule rules.
 */
export function plannedOccurrences(
  series: Pick<
    RecurringExpense,
    'id' | 'type' | 'amountCents' | 'categoryId' | 'note' | 'frequency' | 'interval' | 'startDate' | 'endDate' | 'paused' | 'generatedThrough'
  >[],
  today: string,
  monthsAhead: number = PLANNING_MONTHS_AHEAD,
  booked?: ReadonlySet<string>,
): PlannedEntry[] {
  const end = planningEnd(today, monthsAhead)
  const result: PlannedEntry[] = []
  for (const s of series) {
    if (s.paused) continue
    const cursor = s.generatedThrough
    const after = cursor !== undefined && cursor > today ? cursor : today
    for (const date of occurrencesBetween(s, after, end)) {
      const key = bookedKey(s.id, date)
      if (booked?.has(key)) continue
      result.push({
        key,
        seriesId: s.id,
        type: s.type,
        amountCents: s.amountCents,
        categoryId: s.categoryId,
        date,
        note: s.note,
        planned: true,
      })
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.seriesId - b.seriesId)
}

/** True if planned entries are not shown for this "YYYY-MM" month (it is beyond the planning window). */
export const isBeyondPlanningHorizon = (month: string, today: string, monthsAhead: number = PLANNING_MONTHS_AHEAD): boolean =>
  month > monthOf(planningEnd(today, monthsAhead))

/** The planned entries that fall into a "YYYY-MM" month. */
export const plannedForMonth = (planned: PlannedEntry[], month: string): PlannedEntry[] =>
  planned.filter((p) => monthOf(p.date) === month)
