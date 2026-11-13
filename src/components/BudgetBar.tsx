import { budgetStatus } from '../lib/finance'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'

const COLORS = { ok: 'bg-emerald-500', warn: 'bg-amber-500', over: 'bg-red-500' }

/**
 * Progress bar "spent of limit". Used for the month's income (limit = income) and for category budgets.
 * Green up to 80 %, amber above 80 %, red when over.
 */
export default function BudgetBar({ spentCents, budgetCents }: { spentCents: number; budgetCents: number }) {
  const t = useT()
  const { ratio, level, remainingCents } = budgetStatus(spentCents, budgetCents)
  const over = level === 'over'

  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${COLORS[level]}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {t.budgetOf(formatEUR(spentCents), formatEUR(budgetCents))}
        </span>
        <span className={over ? 'font-semibold text-red-500' : ''}>
          {over ? `${formatEUR(-remainingCents)} ${t.budgetOver}` : `${formatEUR(remainingCents)} ${t.budgetLeft}`}
        </span>
      </div>
    </div>
  )
}
