import SeriesList from '../components/SeriesList'
import { useT } from '../lib/i18n'

/** Things you manage regularly: recurring payments (and, later in this redesign, category budgets). */
export default function PlanningScreen() {
  const t = useT()
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-2xl font-bold">{t.tabPlanning}</h1>
      <SeriesList />
    </div>
  )
}
