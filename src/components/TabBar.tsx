import { useT } from '../lib/i18n'

export type Tab = 'expenses' | 'stats' | 'settings'

const TABS: { id: Tab; icon: string }[] = [
  { id: 'expenses', icon: '💶' },
  { id: 'stats', icon: '📊' },
  { id: 'settings', icon: '⚙️' },
]
const LABEL_KEY = { expenses: 'tabOverview', stats: 'tabStats', settings: 'tabSettings' } as const

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useT()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => onChange(tb.id)}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              tab === tb.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <span className="text-xl">{tb.icon}</span>
            {t[LABEL_KEY[tb.id]]}
          </button>
        ))}
      </div>
    </nav>
  )
}
