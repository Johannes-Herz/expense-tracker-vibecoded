import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useEffect, useState } from 'react'
import { formatEUR } from '../lib/format'

// Register only what we use (keeps the bundle small). The controllers are registered explicitly: the
// react-chartjs-2 components (<Bar>, <Line>, ...) only register theirs as a side effect, which the
// production build drops when a component is no longer used anywhere - and the mixed bar/line chart
// (<Chart type="bar">) then fails with '"bar" is not a registered controller'.
Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
)
Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
Chart.defaults.maintainAspectRatio = false

/** Colors for axis text and grid lines; updates when the dark class on <html> changes. */
export function useChartTheme() {
  const read = () => document.documentElement.classList.contains('dark')
  const [dark, setDark] = useState(read)

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return {
    dark,
    text: dark ? '#94a3b8' : '#64748b',
    grid: dark ? '#1e293b' : '#e2e8f0',
    surface: dark ? '#0f172a' : '#ffffff',
  }
}

/** Tooltip text for a dataset whose values are in CENTS (e.g. the doughnut): "Name: 12,50 €". */
export const eurTooltip = {
  callbacks: {
    label: (ctx: { dataset: { label?: string }; parsed: number | { y: number | null } }) => {
      const value = typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed.y ?? 0)
      const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
      return `${label}${formatEUR(value)}`
    },
  },
}

/**
 * Tooltip text for a dataset whose values are already in EUROS (charts that plot cents / 100):
 * "Name: 418,00 €". Do not use `eurTooltip` for these: it expects cents and would divide by 100 again.
 */
export function euroValueLabel(ctx: { dataset: { label?: string }; parsed: { y: number | null } }): string {
  return eurTooltip.callbacks.label({ dataset: ctx.dataset, parsed: Math.round((ctx.parsed.y ?? 0) * 100) })
}
