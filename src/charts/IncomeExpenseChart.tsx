import { Chart } from 'react-chartjs-2'
import type { MonthPoint } from '../lib/finance'
import { formatMonthShort } from '../lib/format'
import { useT } from '../lib/i18n'
import { eurTooltip, useChartTheme } from './chartSetup'

/** Grouped bars income vs. expenses per month, with the balance (income − expenses) as a line. */
export default function IncomeExpenseChart({ points }: { points: MonthPoint[] }) {
  const t = useT()
  const theme = useChartTheme()
  return (
    <div className="h-60">
      <Chart
        type="bar"
        data={{
          labels: points.map((p) => formatMonthShort(p.month)),
          datasets: [
            {
              type: 'bar' as const,
              label: t.incomes,
              data: points.map((p) => p.incomeCents / 100),
              backgroundColor: '#10b981',
              borderRadius: 3,
              maxBarThickness: 14,
              order: 2,
            },
            {
              type: 'bar' as const,
              label: t.expenses,
              data: points.map((p) => p.expenseCents / 100),
              backgroundColor: '#6366f1',
              borderRadius: 3,
              maxBarThickness: 14,
              order: 2,
            },
            {
              type: 'line' as const,
              label: t.balance,
              data: points.map((p) => p.balanceCents / 100),
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              borderWidth: 2,
              pointRadius: 2.5,
              tension: 0.25,
              order: 1,
            },
          ],
        }}
        options={{
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: theme.text, boxWidth: 12, boxHeight: 12 } },
            tooltip: {
              callbacks: {
                title: (items) => points[items[0].dataIndex].month,
                label: (ctx) => eurTooltip.callbacks.label({ dataset: ctx.dataset, parsed: ctx.parsed.y ?? 0 }),
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: theme.text, font: { size: 10 } } },
            y: {
              grid: { color: theme.grid },
              border: { display: false },
              ticks: { color: theme.text, maxTicksLimit: 6, callback: (v) => `${v} €` },
            },
          },
        }}
      />
    </div>
  )
}
