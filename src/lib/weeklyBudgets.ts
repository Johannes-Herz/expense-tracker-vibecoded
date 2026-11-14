// Weekly budgets per category: spent vs. the weekly share of the monthly budget, per week segment.
// Pure functions, see weeks.ts for the week and cent rules.
//
// Which spending counts: expenses only (income never), booked + planned recurring payments (the same
// forecast logic as the category budgets).
//
// Running balance within the month: what a week does not use carries forward, and so does overspending.
// So a week is judged by the budget of all days from the 1st through the end of the week against all
// spending in that time. A bulk shop that covers two weeks is not "overspending" as long as the budget
// of those weeks (plus earlier leftovers) pays for it, and the last week of the month gets exactly the
// verdict of the monthly budget. The balance starts at 0 on the 1st of every month (a week split
// between two months starts fresh in the new month).
import type { Category } from '../db'
import type { Entry } from './finance'
import { budgetForDays, weekSegments, weeklyBudgetCents, type WeekSegment } from './weeks'

/** past = week is over, current = today is in it, future = not started yet (only planned entries can exist). */
export type WeekState = 'past' | 'current' | 'future'

/**
 * over    = spending so far in the month exceeds the budget up to the end of this week (red ▲; certain
 *           for a running week, spending can only grow)
 * under   = week is over and the running balance is not negative (green ▼)
 * running = week not over yet and not exceeded: still open (neutral ●)
 */
export type WeekLevel = 'over' | 'under' | 'running'

export interface WeekCategoryStatus {
  categoryId: number
  budgetCents: number // this week's own share of the monthly budget
  carryCents: number // balance carried in from earlier weeks of the month (negative = already overspent)
  availableCents: number // budgetCents + carryCents
  spentCents: number // spent in this week only, booked + planned
  plannedCents: number // the planned part of spentCents
  cumBudgetCents: number // budget of all days from the 1st through the end of this week
  cumSpentCents: number // spending from the 1st through the end of this week
  remainingCents: number // cumBudgetCents − cumSpentCents (negative = over)
  usedRatio: number // cumSpent / cumBudget; 0 if the budget is 0 and nothing was spent, Infinity if only spending
  paceBudgetCents: number // budget for the days from the 1st up to today (current week only, else = cumBudgetCents)
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
  const monthStart = `${month}-01`
  const todayDay = Number(today.slice(8))
  return weekSegments(month).map((segment) => {
    const state = weekState(segment, today)
    const startDay = Number(segment.start.slice(8))
    const endDay = Number(segment.end.slice(8))
    const items = tracked.map((c): WeekCategoryStatus => {
      const monthly = c.budgetCents!
      const sum = (list: Entry[], from: string, to: string) =>
        list
          .filter((e) => e.type === 'expense' && e.categoryId === c.id && e.date >= from && e.date <= to)
          .reduce((total, e) => total + e.amountCents, 0)
      const all = [...booked, ...planned]
      const budgetCents = weeklyBudgetCents(monthly, segment)
      const cumBudgetCents = budgetForDays(monthly, month, 1, endDay)
      const prevCumBudget = budgetForDays(monthly, month, 1, startDay - 1)
      const cumSpentCents = sum(all, monthStart, segment.end)
      const prevCumSpent = cumSpentCents - sum(all, segment.start, segment.end)
      const carryCents = prevCumBudget - prevCumSpent
      return {
        categoryId: c.id,
        budgetCents,
        carryCents,
        availableCents: budgetCents + carryCents,
        spentCents: sum(all, segment.start, segment.end),
        plannedCents: sum(planned, segment.start, segment.end),
        cumBudgetCents,
        cumSpentCents,
        remainingCents: cumBudgetCents - cumSpentCents,
        usedRatio: cumBudgetCents > 0 ? cumSpentCents / cumBudgetCents : cumSpentCents > 0 ? Infinity : 0,
        paceBudgetCents: state === 'current' ? budgetForDays(monthly, month, 1, todayDay) : cumBudgetCents,
        level: weekLevel(cumSpentCents, cumBudgetCents, state),
      }
    })
    // Over-budget categories first (stable, so the rest keeps the category order).
    items.sort((x, y) => Number(y.level === 'over') - Number(x.level === 'over'))
    return { segment, state, items }
  })
}

/** Does this week have anything worth a divider? Only weeks with entries (any category) are listed. */
export const weekHasEntries = (seg: WeekSegment, entries: Pick<Entry, 'date'>[]): boolean =>
  entries.some((e) => e.date >= seg.start && e.date <= seg.end)
