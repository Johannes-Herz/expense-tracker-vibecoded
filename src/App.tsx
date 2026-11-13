import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import TabBar, { type Tab } from './components/TabBar'
import { generateDueExpenses, getSetting, SETTING_THEME } from './db'
import { currentMonth } from './lib/dates'
import { useT } from './lib/i18n'
import { applyTheme, type Theme } from './lib/theme'
import ExpensesScreen from './screens/ExpensesScreen'
import SettingsScreen from './screens/SettingsScreen'
import StatsScreen from './screens/StatsScreen'

export default function App() {
  useT() // applies the saved language before the screens below render
  const [tab, setTab] = useState<Tab>('expenses')
  // The selected month is shared by the Expenses and Stats tabs.
  const [month, setMonth] = useState(currentMonth())

  // Apply the saved theme (default: follow system).
  const theme = useLiveQuery(() => getSetting<Theme>(SETTING_THEME), [])
  useEffect(() => applyTheme(theme ?? 'system'), [theme])

  // Create due recurring expenses on start and whenever the app comes back to the foreground.
  useEffect(() => {
    const run = () => generateDueExpenses().catch((e) => console.error('Recurring expenses failed', e))
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <div className="mx-auto min-h-full max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {tab === 'expenses' && <ExpensesScreen month={month} onMonthChange={setMonth} />}
      {tab === 'stats' && <StatsScreen month={month} onMonthChange={setMonth} />}
      {tab === 'settings' && <SettingsScreen />}
      <TabBar tab={tab} onChange={setTab} />
    </div>
  )
}
