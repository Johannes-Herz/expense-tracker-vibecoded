import { useState } from 'react'
import {
  addExpense,
  addRecurring,
  deleteExpense,
  deleteRecurring,
  generateDueExpenses,
  updateExpense,
  updateRecurring,
  type Category,
  type EntryType,
  type Expense,
  type RecurringExpense,
} from '../db'
import { today } from '../lib/dates'
import { centsToInput, parseAmountToCents } from '../lib/format'
import { occurrencesBetween } from '../lib/recurrence'
import ConfirmDialog from './ConfirmDialog'
import RecurringFields, { type RecurringValue } from './RecurringFields'

interface Props {
  expense?: Expense // set when editing an expense
  series?: RecurringExpense // set when editing a recurring series
  startRecurring?: boolean // adding a new series (checkbox is on and fixed)
  defaultType?: EntryType // type preselected when adding (default: expense)
  categories: Category[]
  onClose: () => void
}

/** Bottom sheet to add or edit an expense or a recurring series. */
export default function ExpenseForm({ expense, series, startRecurring, defaultType, categories, onClose }: Props) {
  const item = series ?? expense
  // The type can only be chosen when adding; existing entries keep theirs.
  const [type, setType] = useState<EntryType>(item?.type ?? defaultType ?? 'expense')
  const isIncome = type === 'income'
  const noun = isIncome ? 'Einnahme' : 'Ausgabe'
  const visibleCategories = categories.filter((c) => c.type === type)
  const [amount, setAmount] = useState(item ? centsToInput(item.amountCents) : '')
  const [categoryId, setCategoryId] = useState<number | undefined>(item?.categoryId)
  const [date, setDate] = useState(series?.startDate ?? expense?.date ?? today())
  const [note, setNote] = useState(item?.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Recurring: only offered when adding; always on when editing a series.
  const [recurring, setRecurring] = useState(!!series || !!startRecurring)
  const [rec, setRec] = useState<RecurringValue>({
    frequency: series?.frequency ?? 'monthly',
    interval: String(series?.interval ?? 1),
    endDate: series?.endDate ?? '',
  })
  const [backfill, setBackfill] = useState(true)
  const [alsoDeleteExpenses, setAlsoDeleteExpenses] = useState(false)
  const isSeriesForm = recurring && !expense
  const interval = Number(rec.interval)

  const cents = parseAmountToCents(amount)
  const recurringValid = !isSeriesForm || (interval >= 1 && (rec.endDate === '' || rec.endDate >= date))
  const canSave = cents !== null && categoryId !== undefined && date !== '' && recurringValid

  // How many past expenses a new series would create right away.
  const pastCount =
    isSeriesForm && !series && recurringValid && date < today()
      ? occurrencesBetween(
          { frequency: rec.frequency, interval, startDate: date, endDate: rec.endDate || undefined },
          undefined,
          today(),
        ).length
      : 0

  async function save() {
    if (!canSave) return
    const trimmedNote = note.trim() || undefined
    if (isSeriesForm) {
      const data = {
        type,
        amountCents: cents,
        categoryId,
        note: trimmedNote,
        frequency: rec.frequency,
        interval,
        startDate: date,
        endDate: rec.endDate || undefined,
      }
      if (series) {
        await updateRecurring(series.id, data)
        await generateDueExpenses()
      } else await addRecurring(data, backfill)
    } else {
      const data = { type, amountCents: cents, categoryId, date, note: trimmedNote }
      if (expense) await updateExpense(expense.id, data)
      else await addExpense(data)
    }
    onClose()
  }

  async function remove() {
    if (series) await deleteRecurring(series.id, { deleteExpenses: alsoDeleteExpenses })
    else if (expense) await deleteExpense(expense.id)
    onClose()
  }

  const title = series
    ? `Wiederkehrende ${noun} bearbeiten`
    : startRecurring
      ? `Neue wiederkehrende ${noun}`
      : expense
        ? `${noun} bearbeiten`
        : `Neue ${noun}`

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[95%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full text-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800" aria-label="Schließen">
            ✕
          </button>
        </div>

        {/* Expense / income switch (only when adding) */}
        {!item && (
          <div className="mb-3 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t)
                  setCategoryId(undefined) // categories differ per type
                }}
                aria-pressed={type === t}
                className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                  type === t
                    ? t === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white shadow-sm dark:bg-slate-600'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t === 'income' ? 'Einnahme' : 'Ausgabe'}
              </button>
            ))}
          </div>
        )}

        {/* Amount */}
        <div className="flex items-baseline justify-center gap-2 rounded-2xl bg-slate-100 py-4 dark:bg-slate-800">
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-44 bg-transparent text-right text-4xl font-bold tabular-nums outline-none placeholder:text-slate-400"
          />
          <span className={`text-3xl font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-500'}`}>€</span>
        </div>

        {/* Category grid */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {visibleCategories.map((c) => {
            const selected = c.id === categoryId
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                aria-label={c.name}
                aria-pressed={selected}
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${
                  selected ? 'scale-105' : 'border-transparent bg-slate-100 dark:bg-slate-800'
                }`}
                style={selected ? { borderColor: c.color, backgroundColor: `${c.color}26` } : undefined}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="mt-0.5 w-full truncate px-0.5 text-[10px] leading-tight">{c.name}</span>
              </button>
            )
          })}
        </div>

        {/* Date + note */}
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-slate-500 dark:text-slate-400">
            {isSeriesForm && <span className="mb-1 block">Startdatum (erste Ausführung)</span>}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl bg-slate-100 px-4 text-base text-slate-900 outline-none dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <input
            type="text"
            maxLength={80}
            placeholder={isSeriesForm ? 'Name, z. B. Miete' : 'Notiz (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-12 w-full rounded-xl bg-slate-100 px-4 outline-none placeholder:text-slate-400 dark:bg-slate-800"
          />
        </div>

        {/* Recurring */}
        {expense?.recurringId !== undefined && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            🔁 Teil einer wiederkehrenden Buchung. Änderungen gelten nur für diese Buchung.
          </p>
        )}
        {!expense && (
          <div className="mt-4">
            {!series && !startRecurring && (
              <label className="flex min-h-12 items-center gap-3">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="h-5 w-5 accent-indigo-600"
                />
                <span className="font-medium">🔁 Wiederkehrend</span>
              </label>
            )}
            {recurring && (
              <div className="mt-2 space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <RecurringFields value={rec} onChange={setRec} />
                {!recurringValid && (
                  <p className="text-sm text-red-500">Intervall mindestens 1; Enddatum nicht vor dem Startdatum.</p>
                )}
                {!series && date < today() && (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={backfill}
                      onChange={(e) => setBackfill(e.target.checked)}
                      className="mt-0.5 h-5 w-5 accent-indigo-600"
                    />
                    <span className="text-sm">
                      Vergangene Ausführungen anlegen
                      <span className="block text-slate-500 dark:text-slate-400">
                        {backfill
                          ? `${pastCount} Buchungen werden angelegt.`
                          : 'Es werden nur heutige und künftige Buchungen angelegt.'}
                      </span>
                    </span>
                  </label>
                )}
                {series && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Änderungen gelten nur für künftige Ausführungen. Bereits angelegte Buchungen bleiben unverändert.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          {(expense || series) && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="h-14 rounded-2xl bg-red-50 px-5 font-semibold text-red-600 active:bg-red-100 dark:bg-red-950 dark:active:bg-red-900"
            >
              Löschen
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className={`h-14 flex-1 rounded-2xl text-lg font-semibold text-white transition-colors disabled:opacity-40 ${isIncome ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-indigo-600 active:bg-indigo-700'}`}
          >
            Speichern
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={series ? `Wiederkehrende ${noun} löschen?` : `${noun} löschen?`}
          message={series ? 'Es werden keine weiteren Buchungen mehr angelegt.' : 'Das kann nicht rückgängig gemacht werden.'}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        >
          {series && (
            <label className="mt-3 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={alsoDeleteExpenses}
                onChange={(e) => setAlsoDeleteExpenses(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-red-600"
              />
              Auch alle bereits angelegten Buchungen dieser Serie löschen
            </label>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
