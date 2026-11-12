export type Tab = 'expenses' | 'stats' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'expenses', label: 'Ausgaben', icon: '💶' },
  { id: 'stats', label: 'Statistik', icon: '📊' },
  { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
