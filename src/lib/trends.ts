// Category trends: is spending in a category rising, falling or stable compared to the usual level?
// Pure functions only (no database, no "now"): callers pass the entries and `today`.
//
// Reference month = the month being looked at. "Usual level" (Ø) = average of the N FULL months before it.
// Finished months are compared as a whole. The *current* (unfinished) month is judged one-sidedly, because
// spending only ever grows during a month: already above a usual month is a reliable "up"; anything below
// is shown neutrally as "share of a usual month used so far" (never "falling"). The old same-days comparison
// is kept as secondary information (`pace`).
import type { EntryType } from '../db'
import { addMonths, daysInMonth, monthOf } from './dates'

export type TrendStatus = 'up' | 'down' | 'stable' | 'new' | 'insufficient' | 'progress'

/** Number of bars in the row sparkline (the reference month is the last one). */
export const SPARK_MONTHS = 6

export const DEFAULT_THRESHOLD_PCT = 10
export const AVERAGE_CHOICES = [3, 6, 12] as const
export const DEFAULT_AVERAGE_MONTHS = 3

/** The minimum an entry needs. `recurringId` is set on entries created by a recurring series (fixed costs). */
export interface TrendEntry {
  type: EntryType
  amountCents: number
  date: string // "YYYY-MM-DD"
  categoryId: number
  recurringId?: number
}

export interface TrendCategory {
  id: number
  type: EntryType
  hideFromTrends?: boolean
}

export interface TrendOptions {
  refMonth: string // "YYYY-MM"
  avgMonths: number // N full months before refMonth
  thresholdPct: number // e.g. 10 = ±10 % counts as stable
  today: string // "YYYY-MM-DD"
  includeFixed: boolean // false = ignore entries created by recurring series
  /** Month ("YYYY-MM") of the earliest entry of the whole app; undefined = no data at all. */
  firstEntryMonth?: string
}

export interface TrendRow<C extends TrendCategory = TrendCategory> {
  category: C
  currentCents: number // reference month; month-to-date if it is the current month
  avgCents: number // Ø: average of the N full months before the reference month
  pct: number | null // change vs. Ø in % (unrounded); null for "new" and "insufficient"
  status: TrendStatus // "progress" = unfinished month, not (yet) above a usual month
  shareOfAvg: number | null // "progress" only: current / Ø in % (e.g. 50 = half a usual month so far)
  /** Current month only: the old same-days comparison (to date vs. the same days of the previous months). */
  pace: { avgCents: number; pct: number } | null
  spark: number[] // SPARK_MONTHS values, oldest first, last = reference month
  sparkPartial: boolean // the last bar is month-to-date only
}

/** The n months before `month`, oldest first. */
export function previousMonths(month: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(month, i - n))
}

/** If the reference month is the current one: today's day number (compare up to this day). Otherwise undefined = full months. */
export function dayLimitFor(refMonth: string, today: string): number | undefined {
  return refMonth === monthOf(today) ? Number(today.slice(8, 10)) : undefined
}

/** Sum of the entries in `month`, optionally only up to `day` (capped to the month's length, e.g. 31 → 28 in Feb). */
export function sumInMonth(entries: TrendEntry[], month: string, day?: number): number {
  const last = day === undefined ? 31 : Math.min(day, daysInMonth(month))
  let sum = 0
  for (const e of entries) {
    if (monthOf(e.date) === month && Number(e.date.slice(8, 10)) <= last) sum += e.amountCents
  }
  return sum
}

/**
 * Status and % change for one category.
 * - not enough history → "insufficient" (no percentage)
 * - average 0: current > 0 → "new" (no division by zero), current 0 → "stable" at 0 %
 * - otherwise > +threshold → "up", < −threshold → "down", else "stable" (exactly at the threshold is stable)
 */
export function categoryTrend(
  currentCents: number,
  avgCents: number,
  thresholdPct: number,
  enoughHistory: boolean,
): { status: TrendStatus; pct: number | null } {
  if (!enoughHistory) return { status: 'insufficient', pct: null }
  if (avgCents <= 0) return currentCents > 0 ? { status: 'new', pct: null } : { status: 'stable', pct: 0 }
  const pct = ((currentCents - avgCents) / avgCents) * 100
  return { status: pct > thresholdPct ? 'up' : pct < -thresholdPct ? 'down' : 'stable', pct }
}

/**
 * Status for the UNFINISHED month: `currentCents` is month-to-date, `avgCents` the average of full months.
 * - not enough history → "insufficient"
 * - average 0: spent > 0 → "new" (nothing at all in the whole average period), spent 0 → "stable" at 0 %
 * - spent so far > average × (1 + threshold) → "up" (can only grow, so this is reliable)
 * - otherwise "progress" with the share of a usual month used so far (never "down", the month isn't over)
 */
export function partialMonthTrend(
  currentCents: number,
  avgCents: number,
  thresholdPct: number,
  enoughHistory: boolean,
): { status: TrendStatus; pct: number | null; shareOfAvg: number | null } {
  if (!enoughHistory) return { status: 'insufficient', pct: null, shareOfAvg: null }
  if (avgCents <= 0) {
    return currentCents > 0
      ? { status: 'new', pct: null, shareOfAvg: null }
      : { status: 'stable', pct: 0, shareOfAvg: null }
  }
  const pct = ((currentCents - avgCents) / avgCents) * 100
  if (pct > thresholdPct) return { status: 'up', pct, shareOfAvg: null }
  return { status: 'progress', pct, shareOfAvg: (currentCents / avgCents) * 100 }
}

/** True if the app has data reaching back to the first month of the average window. */
export function hasEnoughHistory(refMonth: string, avgMonths: number, firstEntryMonth?: string): boolean {
  return firstEntryMonth !== undefined && firstEntryMonth <= addMonths(refMonth, -avgMonths)
}

/** Expense entries of one category that count for the trends (fixed costs optional). */
function relevant(entries: TrendEntry[], categoryId: number, includeFixed: boolean): TrendEntry[] {
  return entries.filter((e) => e.type === 'expense' && e.categoryId === categoryId && (includeFixed || e.recurringId === undefined))
}

/** Average of the given full months (rounded to cents). */
const fullAverage = (own: TrendEntry[], months: string[]): number =>
  Math.round(months.reduce((s, m) => s + sumInMonth(own, m), 0) / months.length)

const rank = (s: TrendStatus) => (s === 'new' ? 0 : s === 'insufficient' ? 2 : 1)

/**
 * One row per expense category (hidden categories and categories without any spending in the
 * looked-at months are left out), sorted by change: "new" first, then biggest increase first,
 * "insufficient" at the end.
 */
export function computeTrends<C extends TrendCategory>(entries: TrendEntry[], categories: C[], opts: TrendOptions): TrendRow<C>[] {
  const { refMonth, avgMonths, thresholdPct, today, includeFixed, firstEntryMonth } = opts
  const day = dayLimitFor(refMonth, today)
  const enough = hasEnoughHistory(refMonth, avgMonths, firstEntryMonth)
  const avgWindow = previousMonths(refMonth, avgMonths)
  const sparkMonths = [...previousMonths(refMonth, SPARK_MONTHS - 1), refMonth]
  const looked = new Set([...avgWindow, ...sparkMonths])

  const rows: TrendRow<C>[] = []
  for (const category of categories) {
    if (category.type !== 'expense' || category.hideFromTrends) continue
    const own = relevant(entries, category.id, includeFixed)
    if (!own.some((e) => looked.has(monthOf(e.date)))) continue // nothing in the whole window

    const currentCents = sumInMonth(own, refMonth, day) // month-to-date if the month is unfinished
    const avgCents = fullAverage(own, avgWindow)
    const spark = sparkMonths.map((m, i) => sumInMonth(own, m, i === sparkMonths.length - 1 ? day : undefined))
    const result =
      day === undefined
        ? { ...categoryTrend(currentCents, avgCents, thresholdPct, enough), shareOfAvg: null }
        : partialMonthTrend(currentCents, avgCents, thresholdPct, enough)

    // Secondary info for the unfinished month: how does the spending compare with the same days of the previous months?
    let pace: TrendRow<C>['pace'] = null
    if (day !== undefined) {
      const paceAvg = Math.round(avgWindow.reduce((s, m) => s + sumInMonth(own, m, day), 0) / avgMonths)
      if (paceAvg > 0) pace = { avgCents: paceAvg, pct: ((currentCents - paceAvg) / paceAvg) * 100 }
    }

    rows.push({ category, currentCents, avgCents, ...result, spark, sparkPartial: day !== undefined, pace })
  }

  return rows.sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      (b.pct ?? 0) - (a.pct ?? 0) ||
      b.currentCents - a.currentCents,
  )
}

export interface CategorySeries {
  months: string[] // `count` months ending with refMonth, oldest first
  values: number[] // cents per month (the reference month is month-to-date if it is the current month)
  avgCents: number // Ø: average of the avgMonths FULL months before refMonth, for the dashed line
  partialLast: boolean
}

/** Monthly amounts of one category for the detail chart (default: the last 12 months). */
export function categorySeries(
  entries: TrendEntry[],
  categoryId: number,
  opts: Pick<TrendOptions, 'refMonth' | 'avgMonths' | 'today' | 'includeFixed'>,
  count = 12,
): CategorySeries {
  const { refMonth, avgMonths, today, includeFixed } = opts
  const day = dayLimitFor(refMonth, today)
  const own = relevant(entries, categoryId, includeFixed)
  const months = [...previousMonths(refMonth, count - 1), refMonth]
  const values = months.map((m, i) => sumInMonth(own, m, i === months.length - 1 ? day : undefined))
  const avgCents = fullAverage(own, previousMonths(refMonth, avgMonths))
  return { months, values, avgCents, partialLast: day !== undefined }
}

/** A stored threshold made safe: a number between 1 and 50, default 10. */
export function clampThreshold(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_THRESHOLD_PCT
  return Math.min(50, Math.max(1, n))
}
