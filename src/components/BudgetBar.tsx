import { budgetStatus } from '../lib/finance'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'

const COLORS = { ok: 'bg-emerald-500', warn: 'bg-amber-500', over: 'bg-red-500' }

interface Props {
  spentCents: number // booked
  plannedCents?: number // planned on top (shown as a lighter segment); the status uses booked + planned
  budgetCents: number
}

/**
 * Progress bar "spent of limit". Used for the month's income (limit = income) and for category budgets.
 * Green up to 80 %, amber above 80 %, red when over. A lighter segment shows planned (not yet booked) amounts.
 */
export default function BudgetBar({ spentCents, plannedCents = 0, budgetCents }: Props) {
  const t = useT()
  const { level, remainingCents } = budgetStatus(spentCents + plannedCents, budgetCents)
  const over = level === 'over'
  const share = (cents: number) => (budgetCents > 0 ? Math.min(cents / budgetCents, 1) : cents > 0 ? 1 : 0) * 100
  const bookedWidth = share(spentCents)
  const plannedWidth = share(spentCents + plannedCents) - bookedWidth

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full transition-all duration-500 ${COLORS[level]}`} style={{ width: `${bookedWidth}%` }} />
        {plannedWidth > 0 && (
          <div
            className={`h-full opacity-40 transition-all duration-500 ${COLORS[level]}`}
            style={{ width: `${plannedWidth}%` }}
            title={t.planned}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {plannedCents > 0
            ? t.budgetOfPlanned(formatEUR(spentCents), formatEUR(plannedCents), formatEUR(budgetCents))
            : t.budgetOf(formatEUR(spentCents), formatEUR(budgetCents))}
        </span>
        <span className={`shrink-0 ${over ? 'font-semibold text-red-500' : ''}`}>
          {over ? `${formatEUR(-remainingCents)} ${t.budgetOver}` : `${formatEUR(remainingCents)} ${t.budgetLeft}`}
        </span>
      </div>
    </div>
  )
}
