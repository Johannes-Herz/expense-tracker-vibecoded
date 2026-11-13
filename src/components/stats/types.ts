import type { CategoryTotal } from '../../charts/CategoryDoughnut'
import type { Category, Expense } from '../../db'
import type { BudgetForecast, Forecast, ForecastPoint } from '../../lib/finance'
import type { PlannedEntry } from '../../lib/planned'

/** Everything the Stats groups show, calculated once in StatsScreen for the selected month. */
export interface StatsData {
  month: string
  categories: Category[]
  categoryMap: Map<number, Category>
  f: Forecast // booked, planned and forecast totals of the month
  rate: number | null // savings rate (forecast)
  forecastSeries: ForecastPoint[] // 12 months incl. planned part of the selected month
  budgetRows: BudgetForecast[]
  planned: PlannedEntry[]
  hasPlannedExpenses: boolean
  expenses: Expense[] // booked expenses of the month
  avgPerDay: number
  change: number | null // vs. previous month, %
  categoryTotals: CategoryTotal[]
  current: (number | null)[] // cumulative spending per day
  previous: (number | null)[]
  prevMonth: string
  projected: (number | null)[] | undefined
  overallBalance: number // all months, booked
  plannedNet: number // planned (income − expenses) still to come this month
  hasPlannedThisMonth: boolean
  top5: Expense[]
  months: string[] // last 12 months
  monthTotals: number[] // booked expenses per month
}
