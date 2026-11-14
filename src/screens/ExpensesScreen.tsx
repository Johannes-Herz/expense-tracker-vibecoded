import { useState } from 'react'
import BudgetBar from '../components/BudgetBar'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseList from '../components/ExpenseList'
import MonthSelector from '../components/MonthSelector'
import { db, type Expense, type RecurringExpense } from '../db'
import { useCategories, useMonthExpenses, usePlanned } from '../hooks/useData'
import { today } from '../lib/dates'
import { forecastTotals } from '../lib/finance'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import { isBeyondPlanningHorizon, type PlannedEntry } from '../lib/planned'
import { weekReports } from '../lib/weeklyBudgets'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

export default function ExpensesScreen({ month, onMonthChange }: Props) {
  const t = useT()
  const expenses = useMonthExpenses(month)
  const planned = usePlanned(month)
  const categories = useCategories()
  // null = form closed, "new" = adding, Expense = editing
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  // A planned entry opens its recurring series instead
  const [editingSeries, setEditingSeries] = useState<RecurringExpense | null>(null)

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const plannedList = planned ?? []
  const f = forecastTotals(expenses ?? [], plannedList)
  const hasPlanned = plannedList.length > 0
  const available = f.forecast.balanceCents
  const weeks = weekReports(month, categories, expenses ?? [], plannedList, today())

  async function openSeries(p: PlannedEntry) {
    const series = await db.recurring.get(p.seriesId)
    if (series) setEditingSeries(series)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <MonthSelector month={month} onChange={onMonthChange} />
        <div className="mt-1 text-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {hasPlanned ? t.availableForecast : t.available}
        </div>
        <div className={`text-center text-3xl font-bold tabular-nums ${available < 0 ? 'text-red-500' : ''}`}>
          {formatEUR(available)}
        </div>
        {hasPlanned && (
          <div className="mt-0.5 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.bookedPlanned(
              formatEUR(f.booked.balanceCents),
              formatEUR(Math.abs(f.planned.balanceCents)),
              formatEUR(available),
              f.planned.balanceCents < 0,
            )}
          </div>
        )}
        <div className="mt-3 space-y-2 text-sm">
          <AmountRow
            label={t.incomes}
            sign="+"
            valueClass="text-emerald-600 dark:text-emerald-400"
            booked={f.booked.incomeCents}
            planned={f.planned.incomeCents}
            total={f.forecast.incomeCents}
          />
          <AmountRow
            label={t.expenses}
            booked={f.booked.expenseCents}
            planned={f.planned.expenseCents}
            total={f.forecast.expenseCents}
          />
        </div>
        <div className="mt-4">
          {f.forecast.incomeCents > 0 ? (
            <BudgetBar spentCents={f.booked.expenseCents} plannedCents={f.planned.expenseCents} budgetCents={f.forecast.incomeCents} />
          ) : (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">{t.noIncomeHint}</p>
          )}
        </div>
        {isBeyondPlanningHorizon(month, today()) && (
          <p className="mt-3 text-center text-xs text-slate-400">{t.plannedHorizonHint}</p>
        )}
      </div>

      {expenses && planned && expenses.length === 0 && plannedList.length === 0 ? (
        <p className="py-12 text-center text-slate-500 dark:text-slate-400">
          {t.noEntriesMonth}
          <br />
          {t.tapPlus}
        </p>
      ) : (
        expenses && (
          <ExpenseList
            expenses={expenses}
            planned={plannedList}
            categories={categoryMap}
            onSelect={setEditing}
            onSelectPlanned={openSeries}
            weeks={weeks}
          />
        )
      )}

      <button
        onClick={() => setEditing('new')}
        aria-label={t.addEntry}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1.25rem,calc(50%-12rem+1.25rem))] z-30 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-4xl text-white shadow-lg transition-transform active:scale-90"
      >
        +
      </button>

      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? undefined : editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}

      {editingSeries && (
        <ExpenseForm key={editingSeries.id} series={editingSeries} categories={categories} onClose={() => setEditingSeries(null)} />
      )}
    </div>
  )
}

/** "Einnahmen  +1.200 €" or, with planned amounts, "Ausgaben  1.239,38 €" + "794,38 € gebucht + 445,00 € geplant = …". */
function AmountRow(props: { label: string; sign?: string; valueClass?: string; booked: number; planned: number; total: number }) {
  const t = useT()
  const { label, sign = '', valueClass = '', booked, planned, total } = props
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`font-semibold tabular-nums ${valueClass}`}>
          {sign}
          {formatEUR(total)}
        </span>
      </div>
      {planned > 0 && (
        <div className="text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {t.bookedPlanned(formatEUR(booked), formatEUR(planned), formatEUR(total))}
        </div>
      )}
    </div>
  )
}
