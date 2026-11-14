import type { Category } from '../db'
import { useOverlayBack } from '../hooks/useOverlayBack'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'
import type { WeekReport } from '../lib/weeklyBudgets'
import BudgetBar from './BudgetBar'
import { LEVEL_COLOR, LEVEL_SYMBOL, useWeekLabel } from './WeekDivider'

interface Props {
  report: WeekReport
  categories: Map<number, Category>
  onClose: () => void
}

/** Bottom sheet: spent vs. weekly budget for every weekly-tracked category of one week. */
export default function WeekDetail({ report, categories, onClose }: Props) {
  const t = useT()
  useOverlayBack(onClose) // the back gesture closes the sheet
  const label = useWeekLabel()(report)
  const stateText = { past: t.weekStatePast, current: t.weekStateCurrent, future: t.weekStateFuture }[report.state]
  const levelText = { over: t.weekLevelOver, under: t.weekLevelUnder, running: t.weekLevelRunning }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[95%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{label}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stateText}</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 shrink-0 rounded-full text-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800" aria-label={t.close}>
            ✕
          </button>
        </div>

        <ul className="space-y-4">
          {report.items.map((item) => {
            const cat = categories.get(item.categoryId)
            return (
              <li key={item.categoryId}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg" style={{ backgroundColor: `${cat?.color ?? '#64748b'}26` }}>
                    {cat?.emoji ?? '❓'}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{cat?.name ?? t.unknown}</span>
                  <span className={`shrink-0 text-xs font-medium ${LEVEL_COLOR[item.level]}`}>
                    {LEVEL_SYMBOL[item.level]} {levelText[item.level]}
                  </span>
                </div>
                <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {t.weekAvailable(
                    formatEUR(item.budgetCents),
                    item.carryCents === 0 ? undefined : (item.carryCents > 0 ? '+' : '') + formatEUR(item.carryCents),
                    formatEUR(item.availableCents),
                  )}
                </p>
                {item.availableCents > 0 || item.remainingCents >= 0 ? (
                  <BudgetBar spentCents={item.spentCents - item.plannedCents} plannedCents={item.plannedCents} budgetCents={item.availableCents} />
                ) : (
                  <p className="text-sm font-medium text-red-500">
                    {t.weekNoRoom(formatEUR(item.spentCents), formatEUR(Math.max(-item.remainingCents, 0)))}
                  </p>
                )}
                {report.state === 'current' && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.weekPace(formatEUR(item.paceBudgetCents))}</p>
                )}
              </li>
            )
          })}
        </ul>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t.weekBudgetNote}</p>
      </div>
    </div>
  )
}
