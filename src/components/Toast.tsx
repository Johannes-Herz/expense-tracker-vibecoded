import { useEffect } from 'react'
import { useT } from '../lib/i18n'

/** Short message above the tab bar; disappears by itself after a few seconds. */
export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const timer = setTimeout(onClose, 6000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-start justify-between gap-3 rounded-2xl bg-slate-900 p-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
      >
        <span>{message}</span>
        <button onClick={onClose} aria-label={t.close} className="shrink-0 px-1">
          ✕
        </button>
      </div>
    </div>
  )
}
