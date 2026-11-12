import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import './../charts/chartSetup'
import CategoryDoughnut from '../charts/CategoryDoughnut'
import CumulativeLine from '../charts/CumulativeLine'
import MonthlyBar from '../charts/MonthlyBar'
import MonthSelector from '../components/MonthSelector'
import { db, getExpensesInRange, type Expense } from '../db'
import { useCategories } from '../hooks/useData'
import { addMonths, currentMonth, daysInMonth, lastMonths, monthOf, monthRange, today } from '../lib/dates'
import { formatDate, formatEUR, formatPercent } from '../lib/format'
import { occurrencesBetween } from '../lib/recurrence'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

const sum = (list: Expense[]) => list.reduce((s, e) => s + e.amountCents, 0)

/** Cumulative spending per day of the month. Days after `lastDay` are null (line stops). */
function cumulativeByDay(expenses: Expense[], month: string, lastDay: number): (number | null)[] {
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
  const all = useLiveQuery(() => getExpensesInRange(monthRange(months[0]).start, monthRange(month).end), [month])
  const series = useLiveQuery(() => db.recurring.toArray(), [])
  if (!all || !series) return null

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

  // Line chart: this month stops at today if it is the current month
  const current = cumulativeByDay(expenses, month, isCurrent ? daysElapsed : dayCount)
  const previous = cumulativeByDay(prevExpenses, prevMonth, daysInMonth(prevMonth))

  // Upcoming fixed costs: recurring occurrences still due later this month (current month only).
  const upcoming = isCurrent
    ? series
        .filter((r) => !r.paused)
        .flatMap((r) =>
          occurrencesBetween(r, today(), `${month}-${String(dayCount).padStart(2, '0')}`).map((date) => ({
            key: `${r.id}-${date}`,
            date,
            label: r.note || categories.find((c) => c.id === r.categoryId)?.name || '',
            emoji: categories.find((c) => c.id === r.categoryId)?.emoji ?? '❓',
            cents: r.amountCents,
          })),
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : []

  const top5 = [...expenses].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5)
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
        <MonthSelector month={month} onChange={onMonthChange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Gesamt" value={formatEUR(total)} />
        <SummaryCard label="Ø pro Tag" value={formatEUR(avgPerDay)} />
        <SummaryCard label="Anzahl Ausgaben" value={String(expenses.length)} />
        <SummaryCard
          label="Vs. Vormonat"
          value={change === null ? '–' : formatPercent(change)}
          valueClass={change === null ? '' : change > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
      </div>

      {upcoming.length > 0 && (
        <Card title="Anstehende Fixkosten diesen Monat">
          <div className="mb-2 text-2xl font-bold tabular-nums">{formatEUR(upcoming.reduce((t, u) => t + u.cents, 0))}</div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map((u) => (
              <li key={u.key} className="flex items-center gap-3 py-2">
                <span className="text-xl">{u.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{u.label}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(u.date)}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatEUR(u.cents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {expenses.length === 0 ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">Keine Ausgaben in diesem Monat.</p>
      ) : (
        <>
          <Card title="Nach Kategorie">
            <CategoryDoughnut totals={categoryTotals} />
          </Card>
          <Card title="Kumuliert im Monat">
            <CumulativeLine month={month} current={current} previous={previous} previousMonth={prevMonth} />
          </Card>
        </>
      )}

      <Card title="Letzte 12 Monate">
        <MonthlyBar months={months} totals={months.map((m) => sum(byMonth(m)))} selected={month} />
      </Card>

      {top5.length > 0 && (
        <Card title="Größte Ausgaben">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {top5.map((e) => {
              const cat = categoryMap.get(e.categoryId)
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{cat?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.note || cat?.name}</span>
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

function SummaryCard({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
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
