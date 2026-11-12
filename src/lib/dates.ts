// Date helpers. Dates are plain local "YYYY-MM-DD" strings and months are "YYYY-MM"
// strings, which avoids time zone surprises.

const pad = (n: number) => String(n).padStart(2, '0')

/** Local date → "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return toISODate(new Date())
}

/** "YYYY-MM-DD" → "YYYY-MM". */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function currentMonth(): string {
  return monthOf(today())
}

/** Move a "YYYY-MM" by n months (n can be negative). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** First day of the month and first day of the next month (end is exclusive). */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` }
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** The last n months ending with `month`, oldest first. */
export function lastMonths(month: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(month, i - (n - 1)))
}
