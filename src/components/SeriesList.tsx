import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, setRecurringPaused, type EntryType, type RecurringExpense } from '../db'
import { useCategories } from '../hooks/useData'
import { today } from '../lib/dates'
import { formatDate, formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import { nextOccurrence } from '../lib/recurrence'
import ExpenseForm from './ExpenseForm'

const addButton =
  'h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'

/** All recurring series: edit, pause/resume, add a recurring expense or income. */
export default function SeriesList() {
  const t = useT()
  const categories = useCategories()
  const series = useLiveQuery(() => db.recurring.toArray(), []) ?? []
  // null = closed, { newType } = adding a series, RecurringExpense = editing one
  const [editingSeries, setEditingSeries] = useState<RecurringExpense | { newType: EntryType } | null>(null)

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 font-semibold">{t.recurringEntries}</h2>
      {series.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t.noneYet}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {series.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId)
            const next = nextOccurrence(r, today())
            const status = r.paused ? t.statusPaused : next ? t.statusNext(formatDate(next)) : t.statusEnded
            return (
              <li key={r.id} className="flex items-center gap-2">
                <button onClick={() => setEditingSeries(r)} className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 text-left ${r.paused ? 'opacity-60' : ''}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ backgroundColor: `${cat?.color ?? '#64748b'}26` }}>
                    {cat?.emoji ?? '❓'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.note || cat?.name}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {t.schedule(r.frequency, r.interval)} · {status}
                    </span>
                  </span>
                  {r.type === 'income' ? (
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatEUR(r.amountCents)}</span>
                  ) : (
                    <span className="font-semibold tabular-nums">{formatEUR(r.amountCents)}</span>
                  )}
                </button>
                <button
                  onClick={() => setRecurringPaused(r.id, !r.paused)}
                  aria-label={r.paused ? t.resume : t.pause}
                  title={r.paused ? t.resume : t.pause}
                  className="h-11 w-11 shrink-0 rounded-full text-lg active:bg-slate-100 dark:active:bg-slate-800"
                >
                  {r.paused ? '▶️' : '⏸️'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        <button onClick={() => setEditingSeries({ newType: 'expense' })} className={`${addButton} text-indigo-600 dark:text-indigo-400`}>
          {t.addRecurringExpense}
        </button>
        <button onClick={() => setEditingSeries({ newType: 'income' })} className={`${addButton} text-emerald-600 dark:text-emerald-400`}>
          {t.addRecurringIncome}
        </button>
      </div>

      {editingSeries && (
        <ExpenseForm
          series={'id' in editingSeries ? editingSeries : undefined}
          startRecurring={'newType' in editingSeries}
          defaultType={'newType' in editingSeries ? editingSeries.newType : undefined}
          categories={categories}
          onClose={() => setEditingSeries(null)}
        />
      )}
    </section>
  )
}
