import { useEffect } from 'react'
import { useRoute } from '../hooks/useRoute'
import CategoriesPage from './settings/CategoriesPage'
import DataPage from './settings/DataPage'
import SettingsHome from './settings/SettingsHome'

/** Settings: a start page with links to sub-pages. The page is part of the route, so the back gesture works. */
export default function SettingsScreen() {
  const { route, navigate, up } = useRoute()
  useEffect(() => window.scrollTo({ top: 0 }), [route.sub]) // a new sub-page starts at the top
  if (route.sub === 'categories') return <CategoriesPage onBack={up} />
  if (route.sub === 'data') return <DataPage onBack={up} />
  return <SettingsHome onOpen={(sub) => navigate({ tab: 'settings', sub })} />
}
