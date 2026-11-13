import { useLiveQuery } from 'dexie-react-hooks'
import { db, getExpensesInRange, type Category } from '../db'
import { monthRange } from '../lib/dates'

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
