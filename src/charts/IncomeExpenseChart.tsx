import { Chart } from 'react-chartjs-2'
import type { ForecastPoint } from '../lib/finance'
import { formatMonth, formatMonthShort } from '../lib/format'
import { useT } from '../lib/i18n'
import { euroValueLabel, useChartTheme } from './chartSetup'

/**
 * Grouped bars income vs. expenses per month, with the balance (income − expenses) as a line.
 * Months with planned (not yet booked) recurring entries show that part as a lighter segment on top
 * and the balance line uses the forecast; history months are booked data only.
 */
export default function IncomeExpenseChart({ points }: { points: ForecastPoint[] }) {
  const t = useT()
  const theme = useChartTheme()
  const hasPlanned = points.some((p) => p.plannedIncomeCents > 0 || p.plannedExpenseCents > 0)
  const bar = { type: 'bar' as const, borderRadius: 3, maxBarThickness: 14, order: 2 }

  const datasets = [
    { ...bar, label: t.incomes, data: points.map((p) => (p.incomeCents - p.plannedIncomeCents) / 100), backgroundColor: '#10b981', stack: 'income' },
    ...(hasPlanned
      ? [{ ...bar, label: t.incomePlanned, data: points.map((p) => p.plannedIncomeCents / 100), backgroundColor: '#10b98155', stack: 'income' }]
      : []),
    { ...bar, label: t.expenses, data: points.map((p) => (p.expenseCents - p.plannedExpenseCents) / 100), backgroundColor: '#6366f1', stack: 'expense' },
    ...(hasPlanned
      ? [{ ...bar, label: t.expensePlanned, data: points.map((p) => p.plannedExpenseCents / 100), backgroundColor: '#6366f155', stack: 'expense' }]
      : []),
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
  ]

  return (
    <div className="h-60">
      <Chart
        type="bar"
        data={{ labels: points.map((p) => formatMonthShort(p.month)), datasets }}
        options={{
          interaction: { mode: 'index', intersect: false },
          plugins: {
            // Same small round markers and text size as the other charts and the axes; datasets in their natural order.
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: theme.text,
                usePointStyle: true,
                boxWidth: 7,
                boxHeight: 7,
                padding: 12,
                font: { size: 11 },
                sort: (a, b) => a.datasetIndex! - b.datasetIndex!,
              },
            },
            tooltip: {
              callbacks: {
                title: (items) => formatMonth(points[items[0].dataIndex].month),
                label: euroValueLabel,
              },
            },
          },
          scales: {
            // Stacked so that booked + planned sit on top of each other; income and expenses stay side by side (stack ids).
            x: { stacked: true, grid: { display: false }, ticks: { color: theme.text, font: { size: 10 } } },
            y: {
              stacked: true,
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
