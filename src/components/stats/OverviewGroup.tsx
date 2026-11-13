import CumulativeLine from '../../charts/CumulativeLine'
import { formatDate, formatEUR, formatPercent } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { Card, SummaryCard } from './shared'
import type { StatsData } from './types'

/** "This month at a glance": key numbers, planned entries, spending course, biggest expenses. */
export default function OverviewGroup({ d }: { d: StatsData }) {
  const t = useT()
  const { f, rate, planned, categoryMap } = d
  const hasPlanned = planned.length > 0

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label={t.incomes}
          value={`+${formatEUR(f.forecast.incomeCents)}`}
          valueClass="text-emerald-600 dark:text-emerald-400"
          sub={f.planned.incomeCents > 0 ? t.bookedPlannedShort(formatEUR(f.booked.incomeCents), formatEUR(f.planned.incomeCents)) : undefined}
        />
        <SummaryCard
          label={t.expenses}
          value={formatEUR(f.forecast.expenseCents)}
          sub={f.planned.expenseCents > 0 ? t.bookedPlannedShort(formatEUR(f.booked.expenseCents), formatEUR(f.planned.expenseCents)) : undefined}
        />
        <SummaryCard
          label={t.balance}
          value={formatEUR(f.forecast.balanceCents)}
          valueClass={f.forecast.balanceCents < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}
          sub={
            hasPlanned
              ? t.bookedPlannedShort(formatEUR(f.booked.balanceCents), formatEUR(Math.abs(f.planned.balanceCents)), f.planned.balanceCents < 0)
              : undefined
          }
        />
        <SummaryCard
          label={t.savingsRate}
          value={rate === null ? '–' : formatPercent(rate * 100, false)}
          valueClass={rate === null ? '' : rate < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}
        />
        <SummaryCard label={t.perDay} value={formatEUR(d.avgPerDay)} />
        <SummaryCard label={t.countExpenses} value={String(d.expenses.length)} />
        <SummaryCard
          label={t.vsPrevMonth}
          value={d.change === null ? '–' : formatPercent(d.change)}
          valueClass={d.change === null ? '' : d.change > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
      </div>

      {hasPlanned && (
        <Card title={t.plannedCard}>
          <div className="mb-2 flex flex-wrap gap-x-4 text-sm tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">+{formatEUR(f.planned.incomeCents)}</span>
            <span>−{formatEUR(f.planned.expenseCents)}</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {planned.map((p) => {
              const cat = categoryMap.get(p.categoryId)
              return (
                <li key={p.key} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{cat?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.note || cat?.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(p.date)}</span>
                  </span>
                  {p.type === 'income' ? (
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatEUR(p.amountCents)}</span>
                  ) : (
                    <span className="font-semibold tabular-nums">{formatEUR(p.amountCents)}</span>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.plannedNote}</p>
        </Card>
      )}

      {d.expenses.length === 0 && !d.hasPlannedExpenses ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">{t.noExpensesMonth}</p>
      ) : (
        <Card title={t.cumulative}>
          <CumulativeLine month={d.month} current={d.current} previous={d.previous} previousMonth={d.prevMonth} projected={d.projected} />
        </Card>
      )}

      {d.top5.length > 0 && (
        <Card title={t.biggest}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {d.top5.map((e) => {
              const cat = categoryMap.get(e.categoryId)
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{cat?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.note || cat?.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(e.date)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatEUR(e.amountCents)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
