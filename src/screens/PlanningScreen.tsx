import BudgetsView from '../components/BudgetsView'
import PageHeader from '../components/PageHeader'
import SeriesList from '../components/SeriesList'
import { PLANNING_VIEWS, usePlanningView } from '../hooks/usePlanningView'
import { useT } from '../lib/i18n'

/** Things you manage regularly: recurring payments and monthly category budgets. */
export default function PlanningScreen() {
  const t = useT()
  const [view, setView] = usePlanningView() // last opened part, remembered per device
  const label = { recurring: t.planningRecurring, budgets: t.planningBudgets }

  return (
    <div className="space-y-4">
      <PageHeader title={t.tabPlanning}>
        <div role="tablist" className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {PLANNING_VIEWS.map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`h-9 flex-1 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label[v]}
            </button>
          ))}
        </div>
      </PageHeader>

      {view === 'recurring' ? <SeriesList /> : <BudgetsView />}
    </div>
  )
}
