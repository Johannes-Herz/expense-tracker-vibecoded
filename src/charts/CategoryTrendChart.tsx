import { Line } from 'react-chartjs-2'
import { formatMonth, formatMonthShort } from '../lib/format'
import { useT } from '../lib/i18n'
import type { CategorySeries } from '../lib/trends'
import { euroValueLabel, useChartTheme } from './chartSetup'

interface Props {
  series: CategorySeries
  color: string // highlight color of the current month's point
  avgMonths: number
}

/** Monthly amounts of one category (12 months) with the comparison average as a dashed line. */
export default function CategoryTrendChart({ series, color, avgMonths }: Props) {
  const t = useT()
  const theme = useChartTheme()
  const { months, values, avgCents, partialLast } = series
  const last = months.length - 1

  return (
    <div className="h-56">
      <Line
        data={{
          labels: months.map(formatMonthShort),
          datasets: [
            {
              label: t.expenses,
              data: values.map((c) => c / 100),
              borderColor: '#6366f1',
              backgroundColor: '#6366f1',
              borderWidth: 2,
              tension: 0.2,
              pointRadius: values.map((_, i) => (i === last ? 6 : 3)),
              pointHoverRadius: 6,
              // The current month is highlighted in the badge color; hollow when it is only month-to-date.
              pointBackgroundColor: values.map((_, i) => (i === last ? (partialLast ? theme.surface : color) : '#6366f1')),
              pointBorderColor: values.map((_, i) => (i === last ? color : '#6366f1')),
              pointBorderWidth: values.map((_, i) => (i === last ? 2.5 : 1)),
              order: 1,
            },
            {
              label: t.trendAverageLine(avgMonths),
              data: months.map(() => avgCents / 100),
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              borderWidth: 2,
              borderDash: [6, 4],
              pointRadius: 0,
              pointHoverRadius: 0,
              order: 2,
            },
          ],
        }}
        options={{
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { color: theme.text, usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                title: (items) =>
                  formatMonth(months[items[0].dataIndex]) + (partialLast && items[0].dataIndex === last ? ` (${t.trendPartialMonth})` : ''),
                label: euroValueLabel,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: theme.text, font: { size: 10 } } },
            y: {
              beginAtZero: true,
              grid: { color: theme.grid },
              border: { display: false },
              ticks: { color: theme.text, maxTicksLimit: 5, callback: (v) => `${v} €` },
            },
          },
        }}
      />
    </div>
  )
}
