import type { ReactNode } from 'react'
import { useT } from '../lib/i18n'

interface Props {
  title: string
  onBack?: () => void // shows a "‹" button (sub-pages)
  children?: ReactNode // e.g. a segmented control below the title
}

/** Sticky page header in the same style as the Stats header (white card on a translucent bar). */
export default function PageHeader({ title, onBack, children }: Props) {
  const t = useT()
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur dark:bg-slate-950/95">
      <div className="space-y-1 rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              onClick={onBack}
              aria-label={t.back}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-600 active:bg-slate-200 dark:text-slate-300 dark:active:bg-slate-800"
            >
              ‹
            </button>
          )}
          <h1 className={`min-w-0 flex-1 truncate text-lg font-semibold ${onBack ? '' : 'px-2'}`}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
