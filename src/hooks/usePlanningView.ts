import { useSyncExternalStore } from 'react'

export type PlanningView = 'recurring' | 'budgets'
export const PLANNING_VIEWS: PlanningView[] = ['recurring', 'budgets']

// Which part of the Planung tab was open last, remembered per device (localStorage, never throws).
// A tiny shared store so other screens (e.g. the Stats budgets card) can jump straight to "Budgets".
const KEY = 'planningView'
const listeners = new Set<() => void>()

function read(): PlanningView {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'budgets' ? 'budgets' : 'recurring'
  } catch {
    return 'recurring'
  }
}

let current: PlanningView = read()

export function setPlanningView(view: PlanningView) {
  current = view
  try {
    localStorage.setItem(KEY, view)
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
  listeners.forEach((l) => l())
}

export function usePlanningView(): [PlanningView, (v: PlanningView) => void] {
  const view = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
  return [view, setPlanningView]
}
