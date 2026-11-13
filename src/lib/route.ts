// Pure route helpers: which tab (and which settings sub-page) is shown, and how that maps to the URL hash.
// Hash-based ("#/settings/data") so GitHub Pages needs no server setup and a reload reopens the same page.

export type Tab = 'expenses' | 'stats' | 'planning' | 'settings'
export type SettingsPage = 'categories' | 'data'

export interface Route {
  tab: Tab
  sub?: SettingsPage // only for the settings tab
}

export const TABS: Tab[] = ['expenses', 'stats', 'planning', 'settings']
export const SETTINGS_PAGES: SettingsPage[] = ['categories', 'data']
export const DEFAULT_ROUTE: Route = { tab: 'expenses' }

/** "#/settings/data" → { tab: 'settings', sub: 'data' }. Anything unknown falls back to the overview. */
export function parseRoute(hash: string): Route {
  const [tab, sub] = hash.replace(/^#\/?/, '').split('/')
  if (!(TABS as string[]).includes(tab)) return DEFAULT_ROUTE
  if (tab === 'settings' && (SETTINGS_PAGES as string[]).includes(sub)) return { tab: 'settings', sub: sub as SettingsPage }
  return { tab: tab as Tab }
}

export function buildHash(route: Route): string {
  return `#/${route.tab}${route.tab === 'settings' && route.sub ? `/${route.sub}` : ''}`
}

/** The page one level up (a sub-page → its tab's home). */
export const parentRoute = (route: Route): Route => ({ tab: route.tab })

export const sameRoute = (a: Route, b: Route): boolean => a.tab === b.tab && a.sub === b.sub
