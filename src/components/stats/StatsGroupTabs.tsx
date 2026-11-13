import { STATS_GROUPS, type StatsGroup } from '../../hooks/useStatsGroup'
import { useT } from '../../lib/i18n'

/** Segmented control to switch between the Stats groups. */
export default function StatsGroupTabs({ group, onChange }: { group: StatsGroup; onChange: (g: StatsGroup) => void }) {
  const t = useT()
  const label = { overview: t.statsOverview, categories: t.statsCategories, history: t.statsHistory }
  return (
    <div role="tablist" className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {STATS_GROUPS.map((g) => (
        <button
          key={g}
          role="tab"
          aria-selected={group === g}
          onClick={() => onChange(g)}
          className={`h-9 flex-1 rounded-lg text-sm font-medium transition-colors ${
            group === g ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {label[g]}
        </button>
      ))}
    </div>
  )
}
