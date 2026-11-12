import { addMonths } from '../lib/dates'
import { formatMonth } from '../lib/format'

interface Props {
  month: string // "YYYY-MM"
  onChange: (month: string) => void
}

export default function MonthSelector({ month, onChange }: Props) {
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-600 active:bg-slate-200 dark:text-slate-300 dark:active:bg-slate-800'
  return (
    <div className="flex items-center justify-between">
      <button className={btn} onClick={() => onChange(addMonths(month, -1))} aria-label="Vorheriger Monat">
        ‹
      </button>
      <span className="text-base font-semibold">{formatMonth(month)}</span>
      <button className={btn} onClick={() => onChange(addMonths(month, 1))} aria-label="Nächster Monat">
        ›
      </button>
    </div>
  )
}
