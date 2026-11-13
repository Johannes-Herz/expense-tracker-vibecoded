import { useLiveQuery } from 'dexie-react-hooks'
import { db, getExpensesInRange, getSetting, SETTING_TREND_THRESHOLD, type Category } from '../db'
import { addMonths, currentMonth, monthRange, today } from '../lib/dates'
import { clampThreshold } from '../lib/trends'
import { bookedKey, plannedForMonth, plannedOccurrences, PLANNING_MONTHS_AHEAD, type PlannedEntry } from '../lib/planned'

/** All categories, expense and income (empty array while loading). Filter by `type` where needed. */
export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.toArray(), []) ?? []
}

/** Categories as a lookup table by id. */
export function useCategoryMap(): Map<number, Category> {
  const categories = useCategories()
  return new Map(categories.map((c) => [c.id, c]))
}

/** Expenses and income of a "YYYY-MM" month, newest first. */
export function useMonthExpenses(month: string) {
  return useLiveQuery(() => {
    const { start, end } = monthRange(month)
    return getExpensesInRange(start, end)
  }, [month])
}

const NO_PLANNED: PlannedEntry[] = []

/**
 * Planned (not yet booked) recurring entries of a "YYYY-MM" month, oldest first. Only the current
 * month and the next PLANNING_MONTHS_AHEAD months have any; past and far-future months get none.
 * `undefined` while loading.
 */
export function usePlanned(month: string): PlannedEntry[] | undefined {
  return useLiveQuery(async () => {
    if (month < currentMonth() || month > addMonths(currentMonth(), PLANNING_MONTHS_AHEAD)) return NO_PLANNED
    const now = today()
    const series = await db.recurring.toArray()
    // Safety net: real entries that already carry a future occurrence date are never planned again.
    const future = await db.expenses.where('date').above(now).toArray()
    const booked = new Set(future.filter((e) => e.recurringId !== undefined).map((e) => bookedKey(e.recurringId!, e.occurrenceDate!)))
    return plannedForMonth(plannedOccurrences(series, now, PLANNING_MONTHS_AHEAD, booked), month)
  }, [month])
}

/** Stability threshold for the category trends in % (Settings), default 10, always between 1 and 50. */
export function useTrendThreshold(): number {
  const saved = useLiveQuery(() => getSetting<number>(SETTING_TREND_THRESHOLD), [])
  return clampThreshold(saved)
}
