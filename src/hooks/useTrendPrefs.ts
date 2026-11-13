import { useState } from 'react'
import { AVERAGE_CHOICES, DEFAULT_AVERAGE_MONTHS } from '../lib/trends'

// Per-device view choices for the category trends, kept in localStorage (never throws if it is unavailable).
const KEY_AVG = 'trendAvgMonths'
const KEY_FIXED = 'trendIncludeFixed'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
}

export function useTrendPrefs() {
  const [avgMonths, setAvg] = useState<number>(() => {
    const n = Number(read(KEY_AVG))
    return (AVERAGE_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_AVERAGE_MONTHS
  })
  const [includeFixed, setFixed] = useState<boolean>(() => read(KEY_FIXED) !== 'false') // default: include

  return {
    avgMonths,
    includeFixed,
    setAvgMonths: (n: number) => {
      setAvg(n)
      write(KEY_AVG, String(n))
    },
    setIncludeFixed: (v: boolean) => {
      setFixed(v)
      write(KEY_FIXED, String(v))
    },
  }
}
