import { useSyncExternalStore } from 'react'
import { getNav } from '../lib/nav'

/** The current page (tab and optional settings sub-page) plus the functions to change it. */
export function useRoute() {
  const nav = getNav()
  const route = useSyncExternalStore(nav.subscribe, nav.getRoute)
  return { route, navigate: nav.navigate, up: nav.up }
}
