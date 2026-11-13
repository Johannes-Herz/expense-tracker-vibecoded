import { Line } from 'react-chartjs-2'
import { formatMonth } from '../lib/format'
import { useT } from '../lib/i18n'
import { useChartTheme } from './chartSetup'

interface Props {
  month: string
  current: (number | null)[] // cumulative cents per day (null after "today")
  previous: (number | null)[]
  previousMonth: string
  /** Forecast incl. planned entries (dashed); null before the point where the booked line ends. */
  projected?: (number | null)[]
}

export default function CumulativeLine({ month, current, previous, previousMonth, projected }: Props) {
  const t = useT()
  const theme = useChartTheme()
  const days = Math.max(current.length, previous.length, projected?.length ?? 0)
  const toEuro = (list: (number | null)[]) => Array.from({ length: days }, (_, i) => (list[i] == null ? null : list[i]! / 100))

  return (
    <div className="h-56">
      <Line
        data={{
          labels: Array.from({ length: days }, (_, i) => String(i + 1)),
          datasets: [
            {
              label: formatMonth(month),
              data: toEuro(current),
              borderColor: '#4f46e5',
              backgroundColor: '#4f46e5',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0,
            },
            ...(projected
              ? [
                  {
                    label: `${formatMonth(month)} (${t.forecast})`,
                    data: toEuro(projected),
                    borderColor: '#4f46e5',
                    backgroundColor: '#4f46e5',
                    borderWidth: 2,
                    borderDash: [2, 3],
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0,
                  },
                ]
              : []),
            {
              label: formatMonth(previousMonth),
              data: toEuro(previous),
              borderColor: theme.dark ? '#64748b' : '#94a3b8',
              backgroundColor: theme.dark ? '#64748b' : '#94a3b8',
              borderWidth: 2,
              borderDash: [5, 4],
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0,
            },
          ],
        }}
        options={{
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { color: theme.text, usePointStyle: true, boxWidth: 8 } },
            tooltip: {
              callbacks: {
                title: (items) => t.dayN(items[0].label),
                label: (ctx) =>
                  `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: theme.text, maxTicksLimit: 8 } },
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
