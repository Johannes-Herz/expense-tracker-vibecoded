import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import './../charts/chartSetup'
import CategoryDoughnut from '../charts/CategoryDoughnut'
import CumulativeLine from '../charts/CumulativeLine'
import IncomeExpenseChart from '../charts/IncomeExpenseChart'
import MonthlyBar from '../charts/MonthlyBar'
import BudgetBar from '../components/BudgetBar'
import MonthSelector from '../components/MonthSelector'
import { db, getExpensesInRange, type Expense } from '../db'
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
import { formatDate, formatEUR, formatPercent } from '../lib/format'
import { useT } from '../lib/i18n'

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
  const t = useT()
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
  const rate = savingsRate(f.forecast)
  const forecastSeries = monthlyForecastSeries(everything, planned, months)
  const budgetRows = categoryBudgetForecasts(categories, monthEntries, planned)
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const plannedExpenses = planned.filter((p) => p.type === 'expense')
  const hasPlanned = planned.length > 0

  // Everything below (average, count, change, doughnut, history, top 5) counts booked expenses only.
  const all = everything.filter((e) => e.type === 'expense')
  const byMonth = (m: string) => all.filter((e) => monthOf(e.date) === m)
  const expenses = byMonth(month)
  const prevMonth = addMonths(month, -1)
  const prevExpenses = byMonth(prevMonth)

  // Summary cards
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

  // The "all months" balance only counts real entries; one extra line adds what is still planned this month.
  const plannedNet = plannedThisMonth.reduce((s, p) => s + (p.type === 'income' ? p.amountCents : -p.amountCents), 0)

  const top5 = [...expenses].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5)
  const signed = (cents: number) => (cents > 0 ? '+' : '') + formatEUR(cents)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
        <MonthSelector month={month} onChange={onMonthChange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label={t.incomes}
          value={`+${formatEUR(f.forecast.incomeCents)}`}
          valueClass="text-emerald-600 dark:text-emerald-400"
          sub={f.planned.incomeCents > 0 ? t.bookedPlannedShort(formatEUR(f.booked.incomeCents), formatEUR(f.planned.incomeCents)) : undefined}
        />
        <SummaryCard
          label={t.expenses}
          value={formatEUR(f.forecast.expenseCents)}
          sub={f.planned.expenseCents > 0 ? t.bookedPlannedShort(formatEUR(f.booked.expenseCents), formatEUR(f.planned.expenseCents)) : undefined}
        />
        <SummaryCard
          label={t.balance}
          value={formatEUR(f.forecast.balanceCents)}
          valueClass={f.forecast.balanceCents < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}
          sub={
            hasPlanned
              ? t.bookedPlannedShort(formatEUR(f.booked.balanceCents), formatEUR(Math.abs(f.planned.balanceCents)), f.planned.balanceCents < 0)
              : undefined
          }
        />
        <SummaryCard
          label={t.savingsRate}
          value={rate === null ? '–' : formatPercent(rate * 100, false)}
          valueClass={rate === null ? '' : rate < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}
        />
        <SummaryCard label={t.perDay} value={formatEUR(avgPerDay)} />
        <SummaryCard label={t.countExpenses} value={String(expenses.length)} />
        <SummaryCard
          label={t.vsPrevMonth}
          value={change === null ? '–' : formatPercent(change)}
          valueClass={change === null ? '' : change > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">{t.totalBalance}</div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${overallBalance < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {overallBalance > 0 ? '+' : ''}
          {formatEUR(overallBalance)}
        </div>
        {plannedThisMonth.length > 0 && (
          <div className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {t.totalBalanceForecast}: {signed(overallBalance + plannedNet)}
          </div>
        )}
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.totalBalanceInfo}</div>
      </div>

      <Card title={t.categoryBudgets}>
        {budgetRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.noBudgetsYet}</p>
        ) : (
          <ul className="space-y-4">
            {budgetRows.map((b) => {
              const cat = categoryMap.get(b.categoryId)
              return (
                <li key={b.categoryId}>
                  <div className="mb-1.5 flex items-center gap-2 font-medium">
                    <span>{cat?.emoji}</span>
                    <span className="truncate">{cat?.name}</span>
                  </div>
                  <BudgetBar spentCents={b.bookedCents} plannedCents={b.plannedCents} budgetCents={b.budgetCents} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title={t.incomeVsExpenses}>
        <IncomeExpenseChart points={forecastSeries} />
      </Card>

      {hasPlanned && (
        <Card title={t.plannedCard}>
          <div className="mb-2 flex flex-wrap gap-x-4 text-sm tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">+{formatEUR(f.planned.incomeCents)}</span>
            <span>−{formatEUR(f.planned.expenseCents)}</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {planned.map((p) => {
              const cat = categoryMap.get(p.categoryId)
              return (
                <li key={p.key} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{cat?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.note || cat?.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(p.date)}</span>
                  </span>
                  {p.type === 'income' ? (
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatEUR(p.amountCents)}</span>
                  ) : (
                    <span className="font-semibold tabular-nums">{formatEUR(p.amountCents)}</span>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.plannedNote}</p>
        </Card>
      )}

      {expenses.length === 0 && plannedExpenses.length === 0 ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">{t.noExpensesMonth}</p>
      ) : (
        <>
          {expenses.length > 0 && (
            <Card title={t.byCategory}>
              <CategoryDoughnut totals={categoryTotals} />
            </Card>
          )}
          <Card title={t.cumulative}>
            <CumulativeLine month={month} current={current} previous={previous} previousMonth={prevMonth} projected={projected} />
          </Card>
        </>
      )}

      <Card title={t.last12}>
        <MonthlyBar months={months} totals={months.map((m) => sum(byMonth(m)))} selected={month} />
      </Card>

      {top5.length > 0 && (
        <Card title={t.biggest}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {top5.map((e) => {
              const cat = categoryMap.get(e.categoryId)
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{cat?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{(e as Expense).note || cat?.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(e.date)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatEUR(e.amountCents)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({ label, value, valueClass = '', sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] leading-tight tabular-nums text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}
