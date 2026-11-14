// Week logic for weekly category budgets. Pure functions on "YYYY-MM-DD" / "YYYY-MM" strings.
// All day arithmetic goes through UTC timestamps, so daylight-saving changes cannot shift a day.
//
// Rules: ISO weeks (Monday to Sunday). A week that touches two months is split by days: each month
// only sees its own days. Daily budget = monthly budget / days in the month; the weekly budget is
// the share of the days of that week inside the month. Cents are distributed so the weekly budgets
// of a month add up exactly to the monthly budget.

import { daysInMonth } from './dates'

const DAY_MS = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

const toUtc = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

const fromUtc = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const addDays = (date: string, n: number): string => fromUtc(toUtc(date) + n * DAY_MS)

/** 0 = Monday … 6 = Sunday. */
const weekdayMon0 = (date: string): number => (new Date(toUtc(date)).getUTCDay() + 6) % 7

/** The Monday of the week containing `date`. */
export const weekStartOf = (date: string): string => addDays(date, -weekdayMon0(date))

/** ISO 8601 week number and the ISO year it belongs to (e.g. 2027-01-01 is week 53 of 2026). */
export function isoWeekOf(date: string): { year: number; week: number } {
  const thursday = addDays(date, 3 - weekdayMon0(date)) // the Thursday decides the ISO year
  const year = Number(thursday.slice(0, 4))
  const dayOfYear = Math.round((toUtc(thursday) - Date.UTC(year, 0, 1)) / DAY_MS)
  return { year, week: Math.floor(dayOfYear / 7) + 1 }
}

/** The part of one ISO week that lies inside a month. */
export interface WeekSegment {
  isoYear: number
  week: number
  month: string // "YYYY-MM"
  start: string // first day inside the month
  end: string // last day inside the month
  days: number // end − start + 1
  isSplit: boolean // the week continues in the previous or next month
  key: string // unique per week and month, e.g. "2026-W49@2026-11"
}

/** All week segments of a month, oldest first. A split week appears in both months with its own days. */
export function weekSegments(month: string): WeekSegment[] {
  const first = `${month}-01`
  const last = `${month}-${pad(daysInMonth(month))}`
  const segments: WeekSegment[] = []
  for (let monday = weekStartOf(first); monday <= last; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6)
    const start = monday < first ? first : monday
    const end = sunday > last ? last : sunday
    const { year, week } = isoWeekOf(monday)
    segments.push({
      isoYear: year,
      week,
      month,
      start,
      end,
      days: Number(end.slice(8)) - Number(start.slice(8)) + 1,
      isSplit: start !== monday || end !== sunday,
      key: `${year}-W${pad(week)}@${month}`,
    })
  }
  return segments
}

/** The segment of `month` that contains `date`, or undefined if the date is not in that month. */
export const segmentOf = (month: string, date: string): WeekSegment | undefined =>
  weekSegments(month).find((s) => date >= s.start && date <= s.end)

/**
 * Part of a monthly budget that belongs to the days `fromDay`…`toDay` (1-based day numbers).
 * Cumulative rounding: day d has accumulated floor(monthly × d / daysInMonth) cents, a range gets the
 * difference. Consecutive ranges therefore add up exactly to the monthly budget, and every range is
 * within one cent of its exact share.
 */
export function budgetForDays(monthlyCents: number, month: string, fromDay: number, toDay: number): number {
  const n = daysInMonth(month)
  const cumulative = (d: number) => Math.floor((monthlyCents * d) / n)
  return cumulative(toDay) - cumulative(fromDay - 1)
}

/** Weekly budget of a segment, derived from the monthly budget of the category. */
export const weeklyBudgetCents = (monthlyCents: number, seg: WeekSegment): number =>
  budgetForDays(monthlyCents, seg.month, Number(seg.start.slice(8)), Number(seg.end.slice(8)))

/** Budget for the days of the segment up to and including `date` (pro-rata for a running week). */
export function budgetUntil(monthlyCents: number, seg: WeekSegment, date: string): number {
  if (date < seg.start) return 0
  const upTo = date > seg.end ? seg.end : date
  return budgetForDays(monthlyCents, seg.month, Number(seg.start.slice(8)), Number(upTo.slice(8)))
}
