import { useState } from 'react'
import BudgetBar from '../components/BudgetBar'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseList from '../components/ExpenseList'
import MonthSelector from '../components/MonthSelector'
import type { Expense } from '../db'
import { useCategories, useMonthExpenses } from '../hooks/useData'
import { availableToSpend, totals } from '../lib/finance'
import { formatEUR } from '../lib/format'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

export default function ExpensesScreen({ month, onMonthChange }: Props) {
  const expenses = useMonthExpenses(month)
  const categories = useCategories()
  // null = form closed, "new" = adding, Expense = editing
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const t = totals(expenses ?? [])
  const available = availableToSpend(t)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <MonthSelector month={month} onChange={onMonthChange} />
        <div className="mt-1 text-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Verfügbar</div>
        <div className={`text-center text-3xl font-bold tabular-nums ${available < 0 ? 'text-red-500' : ''}`}>
          {formatEUR(available)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Einnahmen</div>
            <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatEUR(t.incomeCents)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Ausgaben</div>
            <div className="font-semibold tabular-nums">{formatEUR(t.expenseCents)}</div>
          </div>
        </div>
        <div className="mt-4">
          {t.incomeCents > 0 ? (
            <BudgetBar spentCents={t.expenseCents} budgetCents={t.incomeCents} />
          ) : (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Keine Einnahmen in diesem Monat – füge eine Einnahme hinzu, um zu sehen, was verfügbar ist.
            </p>
          )}
        </div>
      </div>

      {expenses && expenses.length === 0 ? (
        <p className="py-12 text-center text-slate-500 dark:text-slate-400">
          Keine Buchungen in diesem Monat.
          <br />
          Tippe auf + um eine hinzuzufügen.
        </p>
      ) : (
        expenses && <ExpenseList expenses={expenses} categories={categoryMap} onSelect={setEditing} />
      )}

      <button
        onClick={() => setEditing('new')}
        aria-label="Buchung hinzufügen"
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
    </div>
  )
}
