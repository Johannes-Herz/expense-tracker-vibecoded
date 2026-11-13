import { useLiveQuery } from 'dexie-react-hooks'
import './../charts/chartSetup'
import CategoriesGroup from '../components/stats/CategoriesGroup'
import HistoryGroup from '../components/stats/HistoryGroup'
import OverviewGroup from '../components/stats/OverviewGroup'
import type { StatsData } from '../components/stats/types'
import MonthSelector from '../components/MonthSelector'
import { db, getExpensesInRange } from '../db'
import { useCategories, usePlanned } from '../hooks/useData'
import { addMonths, currentMonth, daysInMonth, lastMonths, monthOf, monthRange } from '../lib/dates'
import {
  categoryBudgetForecasts,
  forecastTotals,
  monthlyForecastSeries,
  savingsRate,
  totalBalance,
  type Entry,
} from '../lib/finance'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

const sum = (list: Entry[]) => list.reduce((s, e) => s + e.amountCents, 0)

/** Cumulative spending per day of the month. Days after `lastDay` are null (line stops). */
function cumulativeByDay(expenses: Entry[], month: string, lastDay: number): (number | null)[] {
  const perDay = new Array<number>(daysInMonth(month)).fill(0)
  for (const e of expenses) perDay[Number(e.date.slice(8, 10)) - 1] += e.amountCents
  let running = 0
  return perDay.map((cents, i) => {
    running += cents
    return i < lastDay ? running : null
  })
}

export default function StatsScreen({ month, onMonthChange }: Props) {
  const categories = useCategories()

  // One query for the last 12 months (ending with the selected month); everything is derived from it.
  const months = lastMonths(month, 12)
  const everything = useLiveQuery(() => getExpensesInRange(monthRange(months[0]).start, monthRange(month).end), [month])
  const overallBalance = useLiveQuery(async () => totalBalance(await db.expenses.toArray()), []) // all time, informational
  const planned = usePlanned(month) // recurring entries not booked yet (empty outside current/next month)
  const plannedThisMonth = usePlanned(currentMonth())
  if (!everything || overallBalance === undefined || !planned || !plannedThisMonth) return null

  // Income and expenses of the selected month: booked, planned and the forecast (booked + planned)
  const monthEntries = everything.filter((e) => monthOf(e.date) === month)
  const f = forecastTotals(monthEntries, planned)
  const plannedExpenses = planned.filter((p) => p.type === 'expense')

  // Everything below (average, count, change, doughnut, history, top 5) counts booked expenses only.
  const all = everything.filter((e) => e.type === 'expense')
  const byMonth = (m: string) => all.filter((e) => monthOf(e.date) === m)
  const expenses = byMonth(month)
  const prevMonth = addMonths(month, -1)
  const prevExpenses = byMonth(prevMonth)

  // Summary numbers
  const total = sum(expenses)
  const prevTotal = sum(prevExpenses)
  const isCurrent = month === currentMonth()
  const dayCount = daysInMonth(month)
  const daysElapsed = isCurrent ? new Date().getDate() : month < currentMonth() ? dayCount : 0
  const avgPerDay = daysElapsed > 0 ? Math.round(total / daysElapsed) : 0
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null

  // Doughnut: totals per category, biggest first
  const perCategory = new Map<number, number>()
  for (const e of expenses) perCategory.set(e.categoryId, (perCategory.get(e.categoryId) ?? 0) + e.amountCents)
  const categoryTotals = categories
    .filter((c) => perCategory.has(c.id))
    .map((c) => ({ category: c, cents: perCategory.get(c.id)! }))
    .sort((a, b) => b.cents - a.cents)

  // Line chart: booked spending (solid) stops at today; the forecast incl. planned entries continues dashed
  const current = cumulativeByDay(expenses, month, isCurrent ? daysElapsed : dayCount)
  const previous = cumulativeByDay(prevExpenses, prevMonth, daysInMonth(prevMonth))
  const projectedFull = cumulativeByDay([...expenses, ...plannedExpenses], month, dayCount)
  const projected =
    plannedExpenses.length > 0 ? projectedFull.map((v, i) => (isCurrent && i < daysElapsed - 1 ? null : v)) : undefined

  const data: StatsData = {
    month,
    categories,
    categoryMap: new Map(categories.map((c) => [c.id, c])),
    f,
    rate: savingsRate(f.forecast),
    forecastSeries: monthlyForecastSeries(everything, planned, months),
    budgetRows: categoryBudgetForecasts(categories, monthEntries, planned),
    planned,
    hasPlannedExpenses: plannedExpenses.length > 0,
    expenses,
    avgPerDay,
    change,
    categoryTotals,
    current,
    previous,
    prevMonth,
    projected,
    overallBalance,
    // The "all months" balance only counts real entries; one extra line adds what is still planned this month.
    plannedNet: plannedThisMonth.reduce((s, p) => s + (p.type === 'income' ? p.amountCents : -p.amountCents), 0),
    hasPlannedThisMonth: plannedThisMonth.length > 0,
    top5: [...expenses].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    months,
    monthTotals: months.map((m) => sum(byMonth(m))),
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
        <MonthSelector month={month} onChange={onMonthChange} />
      </div>

      <OverviewGroup d={data} />
      <CategoriesGroup d={data} />
      <HistoryGroup d={data} />
    </div>
  )
}
