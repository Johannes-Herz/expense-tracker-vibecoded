import { getLang } from './i18n'

// German-locale formatting of numbers and dates (also in the English UI). Only weekday and month
// names follow the UI language. Amount parsing is here too.

const nameLocale = () => (getLang() === 'en' ? 'en-GB' : 'de-DE')

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

/** 1250 → "12,50 €" */
export function formatEUR(cents: number): string {
  return eur.format(cents / 100)
}

/** Percent with sign, e.g. 12.3 → "+12,3 %" */
export function formatPercent(value: number, withPlus = true): string {
  const sign = value > 0 && withPlus ? '+' : ''
  return `${sign}${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
}

/** "2026-11-12" → "12.11.2026" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}`
}

/** "2026-11-12" → "Do., 12.11." (used as day heading in lists) */
export function formatDayHeading(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).toLocaleDateString(nameLocale(), { weekday: 'short' })
  return `${weekday}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`
}

/** "2026-11" → "November 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(nameLocale(), { month: 'long', year: 'numeric' })
}

/** "2026-11" → "Nov." (short label for chart axes) */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(nameLocale(), { month: 'short' })
}

/**
 * Parse user input like "12,50", "12.5" or "1.234,56" into cents.
 * Returns null if the input is not a valid positive amount.
 */
export function parseAmountToCents(input: string): number | null {
  let s = input.trim().replace(/[€\s]/g, '')
  if (!s) return null
  if (s.includes(',')) {
    // German style: "." is a thousands separator, "," the decimal separator
    s = s.replace(/\./g, '').replace(',', '.')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const cents = Math.round(parseFloat(s) * 100)
  return cents > 0 ? cents : null
}

/** 1250 → "12,50" (for pre-filling the amount input when editing) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** "2026-11-09", "2026-11-15" → "9.–15. Nov"; one day → "30. Nov". Both dates must be in the same month. */
export function formatDayRange(start: string, end: string): string {
  const [y, m, d1] = start.split('-').map(Number)
  const d2 = Number(end.slice(8))
  const month = new Date(y, m - 1, 1).toLocaleDateString(nameLocale(), { month: 'short' }).replace(/\.$/, '')
  return d1 === d2 ? `${d1}. ${month}` : `${d1}.–${d2}. ${month}`
}
