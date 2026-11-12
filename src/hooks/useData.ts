import { useLiveQuery } from 'dexie-react-hooks'
import { db, getExpensesInRange, getSetting, SETTING_BUDGET, type Category } from '../db'
import { monthRange } from '../lib/dates'

/** All categories (empty array while loading). */
export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.toArray(), []) ?? []
}

/** Categories as a lookup table by id. */
export function useCategoryMap(): Map<number, Category> {
  const categories = useCategories()
  return new Map(categories.map((c) => [c.id, c]))
}

/** Expenses of a "YYYY-MM" month, newest first. */
export function useMonthExpenses(month: string) {
  return useLiveQuery(() => {
    const { start, end } = monthRange(month)
    return getExpensesInRange(start, end)
  }, [month])
}

/** Monthly budget in cents, or undefined if none is set. */
export function useBudget(): number | undefined {
  return useLiveQuery(() => getSetting<number>(SETTING_BUDGET), [])
}
