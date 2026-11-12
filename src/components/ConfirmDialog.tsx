interface Props {
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Löschen', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl bg-slate-100 font-medium active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700"
          >
            Abbrechen
          </button>
          <button onClick={onConfirm} className="h-12 flex-1 rounded-xl bg-red-600 font-medium text-white active:bg-red-700">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
