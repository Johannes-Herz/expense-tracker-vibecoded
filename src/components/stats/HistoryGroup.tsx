import IncomeExpenseChart from '../../charts/IncomeExpenseChart'
import MonthlyBar from '../../charts/MonthlyBar'
import { formatEUR } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { Card } from './shared'
import type { StatsData } from './types'

/** "How do things change over time?": 12-month income/expenses and the all-time balance. */
export default function HistoryGroup({ d }: { d: StatsData }) {
  const t = useT()
  const signed = (cents: number) => (cents > 0 ? '+' : '') + formatEUR(cents)
  const { overallBalance } = d
  return (
    <>
      <Card title={t.incomeVsExpenses}>
        <IncomeExpenseChart points={d.forecastSeries} />
      </Card>

      <Card title={t.last12}>
        <MonthlyBar months={d.months} totals={d.monthTotals} selected={d.month} />
      </Card>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">{t.totalBalance}</div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${overallBalance < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {signed(overallBalance)}
        </div>
        {d.hasPlannedThisMonth && (
          <div className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {t.totalBalanceForecast}: {signed(overallBalance + d.plannedNet)}
          </div>
        )}
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.totalBalanceInfo}</div>
      </div>
    </>
  )
}
