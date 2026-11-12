import { formatEUR } from '../lib/format'

export default function BudgetBar({ spentCents, budgetCents }: { spentCents: number; budgetCents: number }) {
  const ratio = spentCents / budgetCents
  const over = ratio > 1
  const color = over ? 'bg-red-500' : ratio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
  const remaining = budgetCents - spentCents

  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {formatEUR(spentCents)} von {formatEUR(budgetCents)}
        </span>
        <span className={over ? 'font-semibold text-red-500' : ''}>
          {over ? `${formatEUR(-remaining)} drüber` : `${formatEUR(remaining)} übrig`}
        </span>
      </div>
    </div>
  )
}
