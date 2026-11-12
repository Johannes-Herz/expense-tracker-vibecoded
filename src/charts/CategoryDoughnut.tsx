import { Doughnut } from 'react-chartjs-2'
import type { Category } from '../db'
import { formatEUR } from '../lib/format'
import { eurTooltip, useChartTheme } from './chartSetup'

export interface CategoryTotal {
  category: Category
  cents: number
}

/** Doughnut of spending per category, with a legend list below (sorted by amount). */
export default function CategoryDoughnut({ totals }: { totals: CategoryTotal[] }) {
  const theme = useChartTheme()
  const sum = totals.reduce((s, t) => s + t.cents, 0)

  return (
    <div>
      <div className="relative h-52">
        <Doughnut
          data={{
            labels: totals.map((t) => t.category.name),
            datasets: [
              {
                data: totals.map((t) => t.cents),
                backgroundColor: totals.map((t) => t.category.color),
                borderColor: theme.surface,
                borderWidth: 2,
              },
            ],
          }}
          options={{ cutout: '62%', plugins: { legend: { display: false }, tooltip: eurTooltip } }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Gesamt</div>
            <div className="text-lg font-bold tabular-nums">{formatEUR(sum)}</div>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {totals.map((t) => (
          <li key={t.category.id} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.category.color }} />
            <span className="flex-1 truncate">
              {t.category.emoji} {t.category.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400">{Math.round((t.cents / sum) * 100)} %</span>
            <span className="w-24 text-right font-medium tabular-nums">{formatEUR(t.cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
