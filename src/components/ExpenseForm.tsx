import { useState } from 'react'
import { addExpense, deleteExpense, updateExpense, type Category, type Expense } from '../db'
import { today } from '../lib/dates'
import { centsToInput, parseAmountToCents } from '../lib/format'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  expense?: Expense // set when editing, undefined when adding
  categories: Category[]
  onClose: () => void
}

/** Bottom sheet to add or edit an expense. */
export default function ExpenseForm({ expense, categories, onClose }: Props) {
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : '')
  const [categoryId, setCategoryId] = useState<number | undefined>(expense?.categoryId)
  const [date, setDate] = useState(expense?.date ?? today())
  const [note, setNote] = useState(expense?.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cents = parseAmountToCents(amount)
  const canSave = cents !== null && categoryId !== undefined && date !== ''

  async function save() {
    if (!canSave) return
    const data = { amountCents: cents, categoryId, date, note: note.trim() || undefined }
    if (expense) await updateExpense(expense.id, data)
    else await addExpense(data)
    onClose()
  }

  async function remove() {
    if (expense) await deleteExpense(expense.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[95%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{expense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full text-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800" aria-label="Schließen">
            ✕
          </button>
        </div>

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
          <span className="text-3xl font-bold text-slate-500">€</span>
        </div>

        {/* Category grid */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {categories.map((c) => {
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full rounded-xl bg-slate-100 px-4 outline-none dark:bg-slate-800"
          />
          <input
            type="text"
            maxLength={80}
            placeholder="Notiz (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-12 w-full rounded-xl bg-slate-100 px-4 outline-none placeholder:text-slate-400 dark:bg-slate-800"
          />
        </div>

        <div className="mt-5 flex gap-3">
          {expense && (
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
            className="h-14 flex-1 rounded-2xl bg-indigo-600 text-lg font-semibold text-white transition-colors active:bg-indigo-700 disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Ausgabe löschen?"
          message="Das kann nicht rückgängig gemacht werden."
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
