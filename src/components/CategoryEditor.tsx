import { useState } from 'react'
import { addCategory, deleteCategoryIfUnused, isCategoryUsed, updateCategory, type Category, type EntryType } from '../db'
import { useOverlayBack } from '../hooks/useOverlayBack'
import { centsToInput, parseAmountToCents } from '../lib/format'
import { useT } from '../lib/i18n'
import ConfirmDialog from './ConfirmDialog'

const EMOJI_SUGGESTIONS = ['🛒', '🍽️', '🚌', '🏠', '🛍️', '💊', '🎉', '📺', '✈️', '📦', '☕', '🎁', '🐶', '👶', '📚', '💻', '🚗', '🏋️', '💇', '🎮']
const INCOME_EMOJIS = ['💼', '👪', '🛠️', '↩️', '💰', '🎁', '🏦', '📈', '🧾', '🎓', '🏠', '🤝', '💵', '🪙', '🛒', '💻', '🎨', '📦', '🚗', '⭐']
const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#eab308', '#06b6d4', '#14b8a6', '#64748b']

interface Props {
  category?: Category // undefined = add a new one
  type?: EntryType // type of a new category (default: expense); ignored when editing
  onClose: () => void
}

export default function CategoryEditor({ category, type: newType, onClose }: Props) {
  const t = useT()
  useOverlayBack(onClose) // the back gesture closes the editor
  const type = category?.type ?? newType ?? 'expense'
  const isIncome = type === 'income'
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? '📦')
  const [color, setColor] = useState(category?.color ?? COLORS[0])
  const [budget, setBudget] = useState(category?.budgetCents ? centsToInput(category.budgetCents) : '')
  const [hideFromTrends, setHideFromTrends] = useState(category?.hideFromTrends ?? false)
  const [trackWeekly, setTrackWeekly] = useState(category?.trackWeekly ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [used, setUsed] = useState(false)

  const budgetCents = budget.trim() === '' ? undefined : parseAmountToCents(budget)
  const hasBudget = typeof budgetCents === 'number' && budgetCents > 0
  const budgetValid = isIncome || budget.trim() === '' || budgetCents !== null
  const canSave = name.trim() !== '' && emoji.trim() !== '' && budgetValid

  async function save() {
    if (!canSave) return
    // An empty budget field removes the budget (undefined deletes the stored field).
    const data = { name: name.trim(), emoji: emoji.trim(), color, budgetCents: isIncome ? undefined : (budgetCents ?? undefined),
      hideFromTrends: !isIncome && hideFromTrends ? true : undefined, // undefined removes the stored field
      trackWeekly: isIncome ? undefined : hasBudget && trackWeekly, // only effective together with a budget
    }
    if (category) await updateCategory(category.id, data)
    else await addCategory({ ...data, type })
    onClose()
  }

  async function askDelete() {
    if (!category) return
    setUsed(await isCategoryUsed(category.id))
    setConfirmDelete(true)
  }

  async function remove() {
    if (category) await deleteCategoryIfUnused(category.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[95%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{category ? t.catEdit : isIncome ? t.catNewIncome : t.catNewExpense}</h2>

        <div className="flex gap-3">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="Emoji"
            className="h-12 w-16 rounded-xl bg-slate-100 text-center text-2xl outline-none dark:bg-slate-800"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.name}
            maxLength={30}
            className="h-12 flex-1 rounded-xl bg-slate-100 px-4 outline-none dark:bg-slate-800"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(isIncome ? INCOME_EMOJIS : EMOJI_SUGGESTIONS).map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className="h-10 w-10 rounded-lg bg-slate-100 text-xl active:scale-90 dark:bg-slate-800">
              {e}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label={t.customColor} className="h-9 w-9 rounded-full bg-transparent" />
        </div>

        {!isIncome && (
          <div className="mt-4">
            <label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">{t.monthlyBudgetOptional}</label>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                placeholder={t.noBudget}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl bg-slate-100 px-4 outline-none placeholder:text-slate-400 dark:bg-slate-800"
              />
              <span className="text-slate-500">€</span>
            </div>
            {hasBudget && (
              <label className="mt-2 flex min-h-12 items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={trackWeekly}
                  onChange={(e) => setTrackWeekly(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600"
                />
                <span>
                  <span className="block text-sm">{t.trackWeekly}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{t.trackWeeklyHint}</span>
                </span>
              </label>
            )}
          </div>
        )}

        {!isIncome && (
          <label className="mt-4 flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={hideFromTrends}
              onChange={(e) => setHideFromTrends(e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
            <span className="text-sm">{t.hideFromTrends}</span>
          </label>
        )}

        <div className="mt-5 flex gap-3">
          {category && (
            <button onClick={askDelete} className="h-14 rounded-2xl bg-red-50 px-5 font-semibold text-red-600 active:bg-red-100 dark:bg-red-950">
              {t.delete}
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="h-14 flex-1 rounded-2xl bg-indigo-600 text-lg font-semibold text-white active:bg-indigo-700 disabled:opacity-40"
          >
            {t.save}
          </button>
        </div>
      </div>

      {confirmDelete &&
        (used ? (
          <ConfirmDialog
            title={t.catInUseTitle}
            message={t.catInUseMsg}
            confirmLabel={t.ok}
            onConfirm={() => setConfirmDelete(false)}
            onCancel={() => setConfirmDelete(false)}
          />
        ) : (
          <ConfirmDialog title={t.catDeleteTitle} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
        ))}
    </div>
  )
}
