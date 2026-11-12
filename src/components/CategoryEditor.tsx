import { useState } from 'react'
import { addCategory, deleteCategoryIfUnused, isCategoryUsed, updateCategory, type Category } from '../db'
import ConfirmDialog from './ConfirmDialog'

const EMOJI_SUGGESTIONS = ['🛒', '🍽️', '🚌', '🏠', '🛍️', '💊', '🎉', '📺', '✈️', '📦', '☕', '🎁', '🐶', '👶', '📚', '💻', '🚗', '🏋️', '💇', '🎮']
const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#eab308', '#06b6d4', '#14b8a6', '#64748b']

interface Props {
  category?: Category // undefined = add a new one
  onClose: () => void
}

export default function CategoryEditor({ category, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? '📦')
  const [color, setColor] = useState(category?.color ?? COLORS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [used, setUsed] = useState(false)

  const canSave = name.trim() !== '' && emoji.trim() !== ''

  async function save() {
    if (!canSave) return
    const data = { name: name.trim(), emoji: emoji.trim(), color }
    if (category) await updateCategory(category.id, data)
    else await addCategory(data)
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
        <h2 className="mb-4 text-lg font-semibold">{category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2>

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
            placeholder="Name"
            maxLength={30}
            className="h-12 flex-1 rounded-xl bg-slate-100 px-4 outline-none dark:bg-slate-800"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EMOJI_SUGGESTIONS.map((e) => (
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
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Eigene Farbe" className="h-9 w-9 rounded-full bg-transparent" />
        </div>

        <div className="mt-5 flex gap-3">
          {category && (
            <button onClick={askDelete} className="h-14 rounded-2xl bg-red-50 px-5 font-semibold text-red-600 active:bg-red-100 dark:bg-red-950">
              Löschen
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="h-14 flex-1 rounded-2xl bg-indigo-600 text-lg font-semibold text-white active:bg-indigo-700 disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>

      {confirmDelete &&
        (used ? (
          <ConfirmDialog
            title="Kategorie wird verwendet"
            message="Es gibt noch Ausgaben in dieser Kategorie. Ändere oder lösche diese zuerst."
            confirmLabel="OK"
            onConfirm={() => setConfirmDelete(false)}
            onCancel={() => setConfirmDelete(false)}
          />
        ) : (
          <ConfirmDialog title="Kategorie löschen?" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
        ))}
    </div>
  )
}
