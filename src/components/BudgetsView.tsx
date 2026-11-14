import { useState } from 'react'
import type { Category } from '../db'
import { useCategories } from '../hooks/useData'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import Card from './Card'
import CategoryEditor from './CategoryEditor'

/** Monthly budget per expense category. Tapping a row opens the normal category editor (one place to edit). */
export default function BudgetsView() {
  const t = useT()
  const categories = useCategories().filter((c) => c.type === 'expense')
  const [editing, setEditing] = useState<Category | null>(null)
  const withBudget = categories.filter((c) => c.budgetCents && c.budgetCents > 0)
  const without = categories.filter((c) => !c.budgetCents)

  const row = (c: Category, right: string, rightClass: string) => (
    <li key={c.id}>
      <button onClick={() => setEditing(c)} className="flex min-h-14 w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ backgroundColor: `${c.color}26` }}>
          {c.emoji}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
        {c.trackWeekly && c.budgetCents ? (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            {t.weeklyTag}
          </span>
        ) : null}
        <span className={`shrink-0 tabular-nums ${rightClass}`}>{right}</span>
      </button>
    </li>
  )

  return (
    <>
      <Card title={t.budgetsTitle}>
        {withBudget.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.budgetsEmpty}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {withBudget.map((c) => row(c, t.budgetPerMonth(formatEUR(c.budgetCents!)), 'font-semibold'))}
          </ul>
        )}
      </Card>

      {without.length > 0 && (
        <Card title={t.noBudgetCategories}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {without.map((c) => row(c, t.setBudget, 'text-sm font-medium text-indigo-600 dark:text-indigo-400'))}
          </ul>
        </Card>
      )}

      {editing && <CategoryEditor key={editing.id} category={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
