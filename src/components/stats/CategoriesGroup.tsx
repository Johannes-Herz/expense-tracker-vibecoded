import CategoryDoughnut from '../../charts/CategoryDoughnut'
import { setPlanningView } from '../../hooks/usePlanningView'
import { useRoute } from '../../hooks/useRoute'
import { useT } from '../../lib/i18n'
import BudgetBar from '../BudgetBar'
import CategoryTrends from '../CategoryTrends'
import { Card } from './shared'
import type { StatsData } from './types'

/** "Where does the money go?": budgets, trends, split by category. */
export default function CategoriesGroup({ d }: { d: StatsData }) {
  const t = useT()
  const { navigate } = useRoute()
  return (
    <>
      <Card title={t.categoryBudgets}>
        {d.budgetRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.noBudgetsYet}</p>
        ) : (
          <ul className="space-y-4">
            {d.budgetRows.map((b) => {
              const cat = d.categoryMap.get(b.categoryId)
              return (
                <li key={b.categoryId}>
                  <div className="mb-1.5 flex items-center gap-2 font-medium">
                    <span>{cat?.emoji}</span>
                    <span className="truncate">{cat?.name}</span>
                  </div>
                  <BudgetBar spentCents={b.bookedCents} plannedCents={b.plannedCents} budgetCents={b.budgetCents} />
                </li>
              )
            })}
          </ul>
        )}
        <button
          onClick={() => {
            setPlanningView('budgets') // jump straight to the budgets part of the Planung tab
            navigate({ tab: 'planning' })
          }}
          className="mt-3 flex h-11 w-full items-center justify-end text-sm font-medium text-indigo-600 dark:text-indigo-400"
        >
          {t.manageBudgets}
        </button>
      </Card>

      <CategoryTrends month={d.month} categories={d.categories} />

      {d.expenses.length > 0 ? (
        <Card title={t.byCategory}>
          <CategoryDoughnut totals={d.categoryTotals} />
        </Card>
      ) : (
        <p className="py-4 text-center text-slate-500 dark:text-slate-400">{t.noExpensesMonth}</p>
      )}
    </>
  )
}
