import type { Category } from '../db'
import { formatDayRange } from '../lib/format'
import { useT } from '../lib/i18n'
import type { WeekCategoryStatus, WeekLevel, WeekReport } from '../lib/weeklyBudgets'

/** Chips that fit on one line of the divider (412 px phone); the rest becomes "+N". */
export const MAX_CHIPS = 4

export const LEVEL_SYMBOL: Record<WeekLevel, string> = { over: '▲', under: '▼', running: '●' }
export const LEVEL_COLOR: Record<WeekLevel, string> = {
  over: 'text-red-500',
  under: 'text-emerald-600 dark:text-emerald-400',
  running: 'text-slate-400',
}

/** "KW 46 · 9.–15. Nov" or, for a week split between two months, "KW 49 · 30. Nov (1 Tag)". */
export function useWeekLabel() {
  const t = useT()
  return (r: WeekReport) =>
    t.weekLabel(r.segment.week, formatDayRange(r.segment.start, r.segment.end), r.segment.isSplit ? r.segment.days : undefined)
}

interface Props {
  report: WeekReport
  categories: Map<number, Category>
  onSelect: (report: WeekReport) => void
}

/** Week header in the list: label on the left, one emoji + ▼/▲/● chip per weekly-tracked category on the right. */
export default function WeekDivider({ report, categories, onSelect }: Props) {
  const t = useT()
  const label = useWeekLabel()(report)
  const shown = report.items.slice(0, MAX_CHIPS) // over-budget categories come first, so they are never hidden
  const more = report.items.length - shown.length
  const tappable = report.items.length > 0

  const content = (
    <>
      <span className="min-w-0 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {shown.map((item) => (
          <Chip key={item.categoryId} item={item} category={categories.get(item.categoryId)} />
        ))}
        {more > 0 && (
          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">+{more}</span>
        )}
      </span>
    </>
  )

  const base = 'flex min-h-11 w-full items-center justify-between gap-2 border-b border-slate-200 px-1 text-left dark:border-slate-800'
  return tappable ? (
    <button onClick={() => onSelect(report)} aria-label={`${label} – ${t.weekDetails}`} className={`${base} active:bg-slate-100 dark:active:bg-slate-900`}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  )
}

function Chip({ item, category }: { item: WeekCategoryStatus; category?: Category }) {
  return (
    <span
      className="flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 text-sm shadow-sm dark:bg-slate-900"
      title={category?.name}
    >
      <span>{category?.emoji ?? '❓'}</span>
      <span className={`text-xs ${LEVEL_COLOR[item.level]}`} aria-hidden>
        {LEVEL_SYMBOL[item.level]}
      </span>
    </span>
  )
}
