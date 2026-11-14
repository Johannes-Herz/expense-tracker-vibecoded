import { today } from '../../lib/dates'
import { formatDayRange } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { trackedCategories, weekReports } from '../../lib/weeklyBudgets'
import { LEVEL_COLOR, LEVEL_SYMBOL } from '../WeekDivider'
import { Card } from './shared'
import type { StatsData } from './types'

/**
 * Weekly view of the weekly-tracked categories for the selected month: one row per category,
 * one column per week (KW), ▼ / ▲ / ● like on the home screen, plus "x of y finished weeks in budget".
 * Not shown when no category is tracked weekly.
 */
export default function WeeklyBudgetsCard({ d }: { d: StatsData }) {
  const t = useT()
  if (trackedCategories(d.categories).length === 0) return null
  const weeks = weekReports(d.month, d.categories, d.expenses, d.planned, today())
  const rows = weeks[0]?.items.map((i) => i.categoryId) ?? []
  const levelText = { over: t.weekLevelOver, under: t.weekLevelUnder, running: t.weekLevelRunning }
  const cols = `minmax(0,1fr) repeat(${weeks.length}, 2.25rem)`
  const cell = (categoryId: number, weekIndex: number) => weeks[weekIndex].items.find((i) => i.categoryId === categoryId)!

  return (
    <Card title={t.weeklyBudgetsTitle}>
      <div className="grid items-center gap-y-1 text-center" style={{ gridTemplateColumns: cols }}>
        <span />
        {weeks.map((w) => (
          <span
            key={w.segment.key}
            className="text-[11px] text-slate-500 dark:text-slate-400"
            title={formatDayRange(w.segment.start, w.segment.end)}
          >
            {w.segment.week}
          </span>
        ))}
        {rows.map((id) => {
          const cat = d.categoryMap.get(id)
          const finished = weeks.map((_, i) => cell(id, i)).filter((c, i) => weeks[i].state === 'past' && c)
          const kept = finished.filter((c) => c.level === 'under').length
          return (
            <div key={id} className="contents">
              <span className="flex min-w-0 flex-col py-1 text-left">
                <span className="flex items-center gap-2 font-medium">
                  <span>{cat?.emoji}</span>
                  <span className="truncate">{cat?.name}</span>
                </span>
                {finished.length > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.weeksInBudget(kept, finished.length)}</span>
                )}
              </span>
              {weeks.map((w, i) => {
                const c = cell(id, i)
                return (
                  <span key={w.segment.key} className={`text-sm ${LEVEL_COLOR[c.level]}`} title={`${cat?.name}: ${levelText[c.level]}`}>
                    {LEVEL_SYMBOL[c.level]}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t.weeklyBudgetsLegend}</p>
    </Card>
  )
}
