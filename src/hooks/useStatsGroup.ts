import { useState } from 'react'

export const STATS_GROUPS = ['overview', 'categories', 'history'] as const
export type StatsGroup = (typeof STATS_GROUPS)[number]

// The last opened Stats group is remembered per device in localStorage (never throws if unavailable).
const KEY = 'statsGroup'

function read(): StatsGroup {
  try {
    const v = localStorage.getItem(KEY)
    return (STATS_GROUPS as readonly string[]).includes(v ?? '') ? (v as StatsGroup) : 'overview'
  } catch {
    return 'overview'
  }
}

export function useStatsGroup(): [StatsGroup, (g: StatsGroup) => void] {
  const [group, setGroup] = useState<StatsGroup>(read)
  return [
    group,
    (g) => {
      setGroup(g)
      try {
        localStorage.setItem(KEY, g)
      } catch {
        /* storage unavailable: the choice just isn't remembered */
      }
    },
  ]
}
