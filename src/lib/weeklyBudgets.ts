// Weekly budgets per category: spent vs. the weekly share of the monthly budget, per week segment.
// Pure functions, see weeks.ts for the week and cent rules.
//
// Which spending counts: expenses only (income never), booked + planned recurring payments (the same
// forecast logic as the category budgets). Nothing carries over between weeks.
import type { Category } from '../db'
import type { Entry } from './finance'
import { budgetUntil, weekSegments, weeklyBudgetCents, type WeekSegment } from './weeks'

/** past = week is over, current = today is in it, future = not started yet (only planned entries can exist). */
export type WeekState = 'past' | 'current' | 'future'

/**
 * over    = spent more than the week's budget (red ▲; certain, spending can only grow)
 * under   = week is over and the budget was kept (green ▼)
 * running = week not over yet and not exceeded: still open (neutral ●)
 */
export type WeekLevel = 'over' | 'under' | 'running'

export interface WeekCategoryStatus {
  categoryId: number
  budgetCents: number // weekly budget (derived from the monthly budget)
  spentCents: number // booked + planned
  plannedCents: number // the planned part of spentCents
  remainingCents: number // budget − spent (negative = over)
  usedRatio: number // spent / budget; 0 if the budget is 0 and nothing was spent, Infinity if only spending
  paceBudgetCents: number // budget for the days up to today (current week only, else = budgetCents)
  level: WeekLevel
}

export interface WeekReport {
  segment: WeekSegment
  state: WeekState
  items: WeekCategoryStatus[] // tracked categories, red first, otherwise in the given category order
}

type TrackedCategory = Pick<Category, 'id' | 'type' | 'budgetCents' | 'trackWeekly'>

/** Expense categories that have a monthly budget and are tracked weekly. */
export const trackedCategories = <T extends TrackedCategory>(categories: T[]): T[] =>
  categories.filter((c) => c.type === 'expense' && c.trackWeekly === true && (c.budgetCents ?? 0) > 0)

export function weekState(seg: WeekSegment, today: string): WeekState {
  return today > seg.end ? 'past' : today < seg.start ? 'future' : 'current'
}

export function weekLevel(spentCents: number, budgetCents: number, state: WeekState): WeekLevel {
  if (spentCents > budgetCents) return 'over'
  return state === 'past' ? 'under' : 'running'
}

/**
 * Report for every week segment of `month`, oldest first (weeks without any tracked spending are
 * included; the UI decides which ones to show). `booked` and `planned` may contain other months,
 * income and untracked categories: they are filtered here.
 */
export function weekReports(
  month: string,
  categories: TrackedCategory[],
  booked: Entry[],
  planned: Entry[],
  today: string,
): WeekReport[] {
  const tracked = trackedCategories(categories)
  return weekSegments(month).map((segment) => {
    const state = weekState(segment, today)
    const inWeek = (e: Entry) => e.type === 'expense' && e.date >= segment.start && e.date <= segment.end
    const bookedWeek = booked.filter(inWeek)
    const plannedWeek = planned.filter(inWeek)
    const items = tracked.map((c): WeekCategoryStatus => {
      const monthly = c.budgetCents!
      const budgetCents = weeklyBudgetCents(monthly, segment)
      const bookedSum = bookedWeek.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amountCents, 0)
      const plannedCents = plannedWeek.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amountCents, 0)
      const spentCents = bookedSum + plannedCents
      return {
        categoryId: c.id,
        budgetCents,
        spentCents,
        plannedCents,
        remainingCents: budgetCents - spentCents,
        usedRatio: budgetCents > 0 ? spentCents / budgetCents : spentCents > 0 ? Infinity : 0,
        paceBudgetCents: state === 'current' ? budgetUntil(monthly, segment, today) : budgetCents,
        level: weekLevel(spentCents, budgetCents, state),
      }
    })
    // Over-budget categories first (stable, so the rest keeps the category order).
    items.sort((a, b) => Number(b.level === 'over') - Number(a.level === 'over'))
    return { segment, state, items }
  })
}

/** Does this week have anything worth a divider? Only weeks with entries (any category) are listed. */
export const weekHasEntries = (seg: WeekSegment, entries: Pick<Entry, 'date'>[]): boolean =>
  entries.some((e) => e.date >= seg.start && e.date <= seg.end)
