import type { Category, Expense } from '../db'
import { formatDayHeading, formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import type { PlannedEntry } from '../lib/planned'

const signed = (cents: number) => (cents > 0 ? '+' : '') + formatEUR(cents)

interface Props {
  expenses: Expense[] // expenses and income, already sorted newest first
  planned?: PlannedEntry[] // recurring entries not booked yet: shown dimmed, not editable
  categories: Map<number, Category>
  onSelect: (expense: Expense) => void
  onSelectPlanned?: (entry: PlannedEntry) => void // opens the recurring series
}

type Item = { kind: 'booked'; e: Expense } | { kind: 'planned'; p: PlannedEntry }

export default function ExpenseList({ expenses, planned = [], categories, onSelect, onSelectPlanned }: Props) {
  const t = useT()
  // Merge booked and planned, newest date first (stable sort keeps the existing order within a date).
  const items: Item[] = [
    ...planned.map((p): Item => ({ kind: 'planned', p })),
    ...expenses.map((e): Item => ({ kind: 'booked', e })),
  ].sort((a, b) => (a.kind === 'booked' ? a.e.date : a.p.date) < (b.kind === 'booked' ? b.e.date : b.p.date) ? 1 : -1)
  const dateOf = (i: Item) => (i.kind === 'booked' ? i.e.date : i.p.date)

  // Group by day, keeping the order.
  const days: { date: string; items: Item[]; total: number }[] = []
  for (const item of items) {
    let day = days[days.length - 1]
    if (!day || day.date !== dateOf(item)) {
      day = { date: dateOf(item), items: [], total: 0 }
      days.push(day)
    }
    day.items.push(item)
    const entry = item.kind === 'booked' ? item.e : item.p
    day.total += entry.type === 'income' ? entry.amountCents : -entry.amountCents // net of the day
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
            {day.items.map((item) => {
              const isPlanned = item.kind === 'planned'
              const e = isPlanned ? item.p : item.e
              const cat = categories.get(e.categoryId)
              return (
                <li key={isPlanned ? item.p.key : item.e.id} className={isPlanned ? 'border-2 border-dashed border-slate-200 dark:border-slate-700' : ''}>
                  <button
                    onClick={() => (isPlanned ? onSelectPlanned?.(item.p) : onSelect(item.e))}
                    title={isPlanned ? t.plannedEntry : undefined}
                    className={`flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800 ${isPlanned ? 'opacity-60' : ''}`}
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
                    {isPlanned ? (
                      <span className="rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        🔁 {t.planned}
                      </span>
                    ) : (
                      item.e.recurringId !== undefined && (
                        <span className="text-sm text-slate-400" title={t.recurring} aria-label={t.recurring}>
                          🔁
                        </span>
                      )
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
