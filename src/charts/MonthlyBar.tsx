import { Bar } from 'react-chartjs-2'
import { formatMonthShort } from '../lib/format'
import { useT } from '../lib/i18n'
import { eurTooltip, useChartTheme } from './chartSetup'

interface Props {
  months: string[] // "YYYY-MM", oldest first
  totals: number[] // cents, same order
  selected: string // highlighted month
}

export default function MonthlyBar({ months, totals, selected }: Props) {
  const t = useT()
  const theme = useChartTheme()
  return (
    <div className="h-52">
      <Bar
        data={{
          labels: months.map(formatMonthShort),
          datasets: [
            {
              label: t.expenses,
              data: totals.map((c) => c / 100),
              // One hue: the selected month is strong, the others are faded.
              backgroundColor: months.map((m) => (m === selected ? '#4f46e5' : '#a5b4fc')),
              borderRadius: 4,
              maxBarThickness: 22,
            },
          ],
        }}
        options={{
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => months[items[0].dataIndex],
                label: (ctx) => eurTooltip.callbacks.label({ dataset: ctx.dataset, parsed: ctx.parsed.y ?? 0 }),
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
