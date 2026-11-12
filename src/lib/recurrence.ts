// Pure date logic for recurring expenses. No database, no "now": callers pass `today`.
// Dates are "YYYY-MM-DD" strings. All math is done on year/month/day numbers (or UTC),
// so time zones and daylight saving time can never shift a date.

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Schedule {
  frequency: Frequency
  interval: number // every N days/weeks/months/years, >= 1
  startDate: string // first occurrence (also the anchor, e.g. "the 31st")
  endDate?: string // last day an occurrence may fall on (inclusive)
}

export interface SeriesState extends Schedule {
  paused: boolean
  /** Last date that was already processed; occurrences on or before it are never created again. */
  generatedThrough?: string
}

/** Safety net against runaway loops (e.g. a daily series starting in the year 1900). */
const MAX_OCCURRENCES = 20000

const pad = (n: number) => String(n).padStart(2, '0')

function parse(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  return [y, m, d]
}

function format(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`
}

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate() // month is 1-based
}

/** Add n days (can be negative) to a "YYYY-MM-DD" date. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = parse(date)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

/**
 * The n-th occurrence (n = 0 is the start date), always computed from the start date.
 * Months are clamped to their last day: monthly from Jan 31 → Feb 28/29 → Mar 31.
 * Yearly from 29 Feb → 28 Feb in non-leap years.
 */
export function occurrenceDate(s: Schedule, n: number): string {
  const [y, m, d] = parse(s.startDate)
  const steps = n * s.interval
  if (s.frequency === 'daily') return addDays(s.startDate, steps)
  if (s.frequency === 'weekly') return addDays(s.startDate, steps * 7)
  const months = s.frequency === 'monthly' ? steps : steps * 12
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return format(year, month, Math.min(d, daysIn(year, month)))
}

/** Occurrence dates with after < date <= through (and <= endDate). `after` undefined = from the start. */
export function occurrencesBetween(s: Schedule, after: string | undefined, through: string): string[] {
  const result: string[] = []
  const last = s.endDate && s.endDate < through ? s.endDate : through
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const date = occurrenceDate(s, n)
    if (date > last) break
    if (after === undefined || date > after) result.push(date)
  }
  return result
}

/** What a generation run should create for one series, and where its cursor moves to. */
export function planGeneration(series: SeriesState, today: string): { occurrences: string[]; newCursor?: string } {
  if (series.paused) return { occurrences: [], newCursor: series.generatedThrough }
  const occurrences = occurrencesBetween(series, series.generatedThrough, today)
  const cursor = series.generatedThrough
  return { occurrences, newCursor: cursor === undefined || today > cursor ? today : cursor }
}

/** Cursor for a new series: undefined = create all past occurrences; otherwise start from today. */
export function initialCursor(backfill: boolean, today: string): string | undefined {
  return backfill ? undefined : addDays(today, -1)
}

/** Cursor after resuming a paused series: the paused period is skipped, not caught up. */
export function cursorOnResume(current: string | undefined, today: string): string {
  const yesterday = addDays(today, -1)
  return current !== undefined && current > yesterday ? current : yesterday
}
