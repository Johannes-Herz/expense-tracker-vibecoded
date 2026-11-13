import { useT } from '../lib/i18n'
import { badgeText, TREND_STYLE } from '../lib/trendStyle'
import type { TrendRow } from '../lib/trends'

export default function TrendBadge({ row }: { row: Pick<TrendRow, 'status' | 'pct'> }) {
  const t = useT()
  const small = row.status === 'insufficient'
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-center font-semibold ${small ? 'text-[10px] leading-tight' : 'text-xs'} ${TREND_STYLE[row.status].badge}`}
    >
      {badgeText(row, t)}
    </span>
  )
}
