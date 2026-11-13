import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, getExpensesInRange, type Category } from '../db'
import { useTrendPrefs } from '../hooks/useTrendPrefs'
import { useTrendThreshold } from '../hooks/useData'
import { addMonths, currentMonth, monthOf, monthRange, today } from '../lib/dates'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import { trendColor } from '../lib/trendStyle'
import { AVERAGE_CHOICES, computeTrends, type TrendOptions } from '../lib/trends'
import Sparkline from './Sparkline'
import TrendBadge from './TrendBadge'
import TrendDetail from './TrendDetail'

interface Props {
  month: string // selected month ("YYYY-MM")
  categories: Category[]
}

export default function CategoryTrends({ month, categories }: Props) {
  const t = useT()
  const { avgMonths, includeFixed, setAvgMonths, setIncludeFixed } = useTrendPrefs()
  const threshold = useTrendThreshold()
  const [selectedId, setSelectedId] = useState<number | null>(null) // category whose detail sheet is open
  const isFuture = month > currentMonth()
  const isCurrent = month === currentMonth()

  // Entries from 12 months before the selected month (longest average) to its end, plus the first month with any data.
  const data = useLiveQuery(async () => {
    const entries = await getExpensesInRange(monthRange(addMonths(month, -12)).start, monthRange(month).end)
    const first = await db.expenses.orderBy('date').first()
    return { entries, firstEntryMonth: first ? monthOf(first.date) : undefined }
  }, [month])

  const opts: TrendOptions = {
    refMonth: month,
    avgMonths,
    thresholdPct: threshold,
    today: today(),
    includeFixed,
    firstEntryMonth: data?.firstEntryMonth,
  }
  const rows = data && !isFuture ? computeTrends(data.entries, categories, opts) : []
  const selected = rows.find((r) => r.category.id === selectedId)

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 font-semibold">{t.categoryTrends}</h2>

      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={t.categoryTrends}>
        {AVERAGE_CHOICES.map((n) => (
          <button
            key={n}
            onClick={() => setAvgMonths(n)}
            aria-pressed={avgMonths === n}
            className={`h-9 flex-1 rounded-lg text-xs font-medium transition-colors ${
              avgMonths === n ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t.avgMonthsLabel(n)}
          </button>
        ))}
      </div>

      <label className="mt-3 flex min-h-10 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={includeFixed}
          onChange={(e) => setIncludeFixed(e.target.checked)}
          className="h-5 w-5 accent-indigo-600"
        />
        {t.includeFixedLabel}
      </label>

      {isCurrent && <p className="mb-1 mt-1 text-xs text-slate-500 dark:text-slate-400">{t.trendToDateNote}</p>}

      {isFuture ? (
        <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t.trendFuture}</p>
      ) : data && rows.length === 0 ? (
        <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t.trendEmpty}</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <li key={r.category.id}>
              <button
                onClick={() => setSelectedId(r.category.id)}
                className="flex min-h-16 w-full items-center gap-3 py-2 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                  style={{ backgroundColor: `${r.category.color}26` }}
                >
                  {r.category.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.category.name}</span>
                  <span className="block truncate text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {t.trendSub(formatEUR(r.currentCents), formatEUR(r.avgCents))}
                  </span>
                </span>
                <Sparkline values={r.spark} highlight={trendColor(r.status)} partialLast={r.sparkPartial} className="shrink-0" />
                <span className="flex w-[5.5rem] shrink-0 justify-end">
                  <TrendBadge row={r} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && data && <TrendDetail row={selected} entries={data.entries} opts={opts} onClose={() => setSelectedId(null)} />}
    </section>
  )
}
