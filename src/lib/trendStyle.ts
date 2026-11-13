import type { TrendRow, TrendStatus } from './trends'
import type { useT } from './i18n'

// Badge look per status (arrow/sign are part of the text, so color is never the only signal).
export const TREND_STYLE: Record<TrendStatus, { badge: string; bar: string }> = {
  up: { badge: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300', bar: '#ef4444' },
  down: { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', bar: '#10b981' },
  stable: { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', bar: '#94a3b8' },
  new: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', bar: '#f59e0b' },
  insufficient: { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', bar: '#94a3b8' },
  progress: { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', bar: '#94a3b8' },
}

export const trendColor = (status: TrendStatus) => TREND_STYLE[status].bar

/** "▲ +29 %", "▼ −15 %", "● stabil", "▲ neu", "zu wenig Daten" */
export function badgeText(row: Pick<TrendRow, 'status' | 'pct' | 'shareOfAvg'>, t: ReturnType<typeof useT>): string {
  const n = row.pct === null ? 0 : Math.round(Math.abs(row.pct))
  switch (row.status) {
    case 'up':
      return `▲ +${n} %`
    case 'down':
      return `▼ −${n} %`
    case 'new':
      return `▲ ${t.trendNew}`
    case 'insufficient':
      return t.trendInsufficient
    case 'progress': // unfinished month, not above a usual month yet: share of a usual month used so far
      return `● ${t.trendShare(Math.round(row.shareOfAvg ?? 0))}`
    default:
      return `● ${t.trendStable}`
  }
}
