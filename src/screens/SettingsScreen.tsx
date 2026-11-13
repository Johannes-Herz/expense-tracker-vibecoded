import { useEffect } from 'react'
import { useRoute } from '../hooks/useRoute'
import CategoriesPage from './settings/CategoriesPage'
import DataPage from './settings/DataPage'
import SettingsHome from './settings/SettingsHome'

/** Settings: a start page with links to sub-pages. The page is part of the route, so the back gesture works. */
export default function SettingsScreen() {
  const { route, navigate, up } = useRoute()
  // A new sub-page starts at the top. Block body on purpose: an effect must not return anything but a cleanup
  // function, and window.scrollTo's return value made React throw "destroy is not a function" (blank screen).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route.sub])
  if (route.sub === 'categories') return <CategoriesPage onBack={up} />
  if (route.sub === 'data') return <DataPage onBack={up} />
  return <SettingsHome onOpen={(sub) => navigate({ tab: 'settings', sub })} />
}
