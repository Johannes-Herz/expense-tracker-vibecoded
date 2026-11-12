import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  message?: string
  children?: ReactNode // extra content, e.g. a checkbox
  confirmLabel?: string
  /** If set, the user must type this word before the confirm button is enabled. */
  requireText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, children, confirmLabel = 'Löschen', requireText, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('')
  const allowed = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>}
        {children}
        {requireText && (
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Tippe „${requireText}“ zur Bestätigung`}
            className="mt-3 h-12 w-full rounded-xl bg-slate-100 px-4 outline-none dark:bg-slate-800"
          />
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl bg-slate-100 font-medium active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={!allowed}
            className="h-12 flex-1 rounded-xl bg-red-600 font-medium text-white active:bg-red-700 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
