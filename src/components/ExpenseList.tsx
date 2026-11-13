import type { Category, Expense } from '../db'
import { formatDayHeading, formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'

const signed = (cents: number) => (cents > 0 ? '+' : '') + formatEUR(cents)

interface Props {
  expenses: Expense[] // expenses and income, already sorted newest first
  categories: Map<number, Category>
  onSelect: (expense: Expense) => void
}

export default function ExpenseList({ expenses, categories, onSelect }: Props) {
  const t = useT()
  // Group by day, keeping the existing (newest first) order.
  const days: { date: string; items: Expense[]; total: number }[] = []
  for (const e of expenses) {
    let day = days[days.length - 1]
    if (!day || day.date !== e.date) {
      day = { date: e.date, items: [], total: 0 }
      days.push(day)
    }
    day.items.push(e)
    day.total += e.type === 'income' ? e.amountCents : -e.amountCents // net of the day
  }

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.date}>
          <div className="mb-1.5 flex justify-between px-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>{formatDayHeading(day.date)}</span>
            <span>{signed(day.total)}</span>
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-slate-800 dark:bg-slate-900">
            {day.items.map((e) => {
              const cat = categories.get(e.categoryId)
              return (
                <li key={e.id}>
                  <button
                    onClick={() => onSelect(e)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
                      style={{ backgroundColor: `${cat?.color ?? '#64748b'}26` }}
                    >
                      {cat?.emoji ?? '❓'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{cat?.name ?? t.unknown}</span>
                      {e.note && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{e.note}</span>}
                    </span>
                    {e.recurringId !== undefined && (
                      <span className="text-sm text-slate-400" title={t.recurring} aria-label={t.recurring}>
                        🔁
                      </span>
                    )}
                    {e.type === 'income' ? (
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatEUR(e.amountCents)}</span>
                    ) : (
                      <span className="font-semibold tabular-nums">{formatEUR(e.amountCents)}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
