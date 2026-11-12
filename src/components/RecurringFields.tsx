import { FREQUENCY_UNITS } from '../lib/format'
import type { Frequency } from '../lib/recurrence'

export interface RecurringValue {
  frequency: Frequency
  interval: string // text while typing
  endDate: string // "" = no end
}

interface Props {
  value: RecurringValue
  onChange: (value: RecurringValue) => void
}

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'daily', label: 'Täglich' },
  { id: 'weekly', label: 'Wöchentlich' },
  { id: 'monthly', label: 'Monatlich' },
  { id: 'yearly', label: 'Jährlich' },
]

const field = 'h-12 rounded-xl bg-slate-100 px-4 outline-none dark:bg-slate-800'

/** Frequency, interval and end date inputs for a recurring expense. */
export default function RecurringFields({ value, onChange }: Props) {
  const interval = Number(value.interval)
  const unit = FREQUENCY_UNITS[value.frequency][interval === 1 ? 0 : 1]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {FREQUENCIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange({ ...value, frequency: f.id })}
            className={`h-10 rounded-lg text-xs font-medium transition-colors ${
              value.frequency === f.id ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Alle</span>
        <input
          inputMode="numeric"
          value={value.interval}
          onChange={(e) => onChange({ ...value, interval: e.target.value.replace(/\D/g, '').slice(0, 3) })}
          className={`${field} w-20 text-center`}
          aria-label="Intervall"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">{unit}</span>
      </div>
      <label className="block text-sm text-slate-500 dark:text-slate-400">
        Enddatum (optional)
        <input
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          className={`${field} mt-1 w-full text-base text-slate-900 dark:text-slate-100`}
        />
      </label>
    </div>
  )
}
