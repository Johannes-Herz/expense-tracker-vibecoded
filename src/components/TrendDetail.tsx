import CategoryTrendChart from '../charts/CategoryTrendChart'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import { trendColor } from '../lib/trendStyle'
import { categorySeries, type TrendEntry, type TrendOptions, type TrendRow } from '../lib/trends'
import TrendBadge from './TrendBadge'

interface Props {
  row: TrendRow & { category: { id: number; name: string; emoji: string; color: string } }
  entries: TrendEntry[]
  opts: TrendOptions
  onClose: () => void
}

/** Bottom sheet with the 12-month course of one category and its average. */
export default function TrendDetail({ row, entries, opts, onClose }: Props) {
  const t = useT()
  const series = categorySeries(entries, row.category.id, opts)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[95%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold">
            {row.category.emoji} {t.trendDetailTitle(row.category.name)}
          </h2>
          <button onClick={onClose} className="h-10 w-10 shrink-0 rounded-full text-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800" aria-label={t.close}>
            ✕
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="min-w-0 text-sm tabular-nums">
            <div className="text-lg font-bold">{formatEUR(row.currentCents)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.avgMonthsLabel(opts.avgMonths)}: {formatEUR(row.avgCents)}</div>
          </div>
          <TrendBadge row={row} />
        </div>

        <CategoryTrendChart series={series} color={trendColor(row.status)} avgMonths={opts.avgMonths} />
      </div>
    </div>
  )
}
