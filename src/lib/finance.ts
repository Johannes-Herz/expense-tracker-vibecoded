// Pure calculations for income, expenses, "available to spend" and category budgets.
// No database access here, so everything is easy to unit test.
import type { EntryType } from '../db'
import { monthOf } from './dates'

/** The minimum an entry needs for these calculations. */
export interface Entry {
  type: EntryType
  amountCents: number
  date: string // "YYYY-MM-DD"
  categoryId: number
}

export interface Totals {
  incomeCents: number
  expenseCents: number
  balanceCents: number // income − expenses (negative = overspent)
}

export function sumByType(entries: Entry[], type: EntryType): number {
  return entries.reduce((sum, e) => (e.type === type ? sum + e.amountCents : sum), 0)
}

/** Income, expenses and balance of the given entries (pass one month's entries for a month). */
export function totals(entries: Entry[]): Totals {
  const incomeCents = sumByType(entries, 'income')
  const expenseCents = sumByType(entries, 'expense')
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents }
}

/** What is left to spend this month: income − expenses. Can be negative. */
export const availableToSpend = (t: Totals): number => t.balanceCents

/** Share of the month's income that is already spent (0 = nothing, 1 = all). 0 if there is no income. */
export function spentRatio(t: Totals): number {
  return t.incomeCents > 0 ? t.expenseCents / t.incomeCents : 0
}

/** (income − expenses) / income, e.g. 0.25 = 25 % saved. `null` if there is no income. Negative if overspent. */
export function savingsRate(t: Totals): number | null {
  return t.incomeCents > 0 ? t.balanceCents / t.incomeCents : null
}

export type BudgetLevel = 'ok' | 'warn' | 'over'

export interface BudgetStatus {
  spentCents: number
  budgetCents: number
  remainingCents: number // negative when over budget
  ratio: number // spent / budget, may be > 1
  level: BudgetLevel // ok: up to 80 %, warn: above 80 % up to 100 %, over: above 100 %
}

export function budgetStatus(spentCents: number, budgetCents: number): BudgetStatus {
  const ratio = budgetCents > 0 ? spentCents / budgetCents : spentCents > 0 ? Infinity : 0
  const level: BudgetLevel = ratio > 1 ? 'over' : ratio > 0.8 ? 'warn' : 'ok'
  return { spentCents, budgetCents, remainingCents: budgetCents - spentCents, ratio, level }
}

/** Expenses (not income) per category id. */
export function expensesByCategory(entries: Entry[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const e of entries) {
    if (e.type === 'expense') map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amountCents)
  }
  return map
}

/** Budget status for every expense category that has a budget (> 0), in the order given. */
export function categoryBudgetStatuses(
  categories: { id: number; type: EntryType; budgetCents?: number }[],
  monthEntries: Entry[],
): (BudgetStatus & { categoryId: number })[] {
  const spent = expensesByCategory(monthEntries)
  return categories
    .filter((c) => c.type === 'expense' && c.budgetCents !== undefined && c.budgetCents > 0)
    .map((c) => ({ categoryId: c.id, ...budgetStatus(spent.get(c.id) ?? 0, c.budgetCents!) }))
}

export interface MonthPoint extends Totals {
  month: string // "YYYY-MM"
}

/** Income, expenses and balance for each of the given months (e.g. from lastMonths), in that order. */
export function monthlySeries(entries: Entry[], months: string[]): MonthPoint[] {
  const byMonth = new Map<string, Entry[]>(months.map((m) => [m, []]))
  for (const e of entries) byMonth.get(monthOf(e.date))?.push(e)
  return months.map((month) => ({ month, ...totals(byMonth.get(month)!) }))
}

/** All-time balance (income − expenses); purely informational, nothing carries over between months. */
export const totalBalance = (entries: Entry[]): number => totals(entries).balanceCents
