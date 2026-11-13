interface Props {
  values: number[] // one bar per value, oldest first; the last one is highlighted
  highlight: string // color of the last bar (hex)
  partialLast?: boolean // last bar is an unfinished month: drawn lighter with an outline
  className?: string
}

const W = 52
const H = 24
const GAP = 2

/** Tiny bar chart as inline SVG (no chart library). Bars are scaled to the largest value. */
export default function Sparkline({ values, highlight, partialLast = false, className }: Props) {
  const max = Math.max(...values, 1)
  const barW = (W - GAP * (values.length - 1)) / values.length
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      {values.map((v, i) => {
        const last = i === values.length - 1
        const h = Math.max(v > 0 ? (v / max) * (H - 2) : 0, 1.5) // at least a thin line so empty months are visible
        const x = i * (barW + GAP)
        return last ? (
          <rect
            key={i}
            x={x + (partialLast ? 0.5 : 0)}
            y={H - h + (partialLast ? 0.5 : 0)}
            width={barW - (partialLast ? 1 : 0)}
            height={Math.max(h - (partialLast ? 1 : 0), 1)}
            rx={1}
            fill={highlight}
            fillOpacity={partialLast ? 0.4 : 1}
            stroke={partialLast ? highlight : undefined}
            strokeWidth={partialLast ? 1 : undefined}
          />
        ) : (
          <rect key={i} x={x} y={H - h} width={barW} height={h} rx={1} className="fill-slate-300 dark:fill-slate-600" />
        )
      })}
    </svg>
  )
}
