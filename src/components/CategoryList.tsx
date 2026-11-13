import type { Category } from '../db'
import { formatEUR } from '../lib/format'
import { useT } from '../lib/i18n'

/** Tappable list of categories (emoji, name, budget if set, color dot). */
export default function CategoryList({ categories, onSelect }: { categories: Category[]; onSelect: (c: Category) => void }) {
  const t = useT()
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {categories.map((c) => (
        <li key={c.id}>
          <button onClick={() => onSelect(c)} className="flex min-h-14 w-full items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: `${c.color}26` }}>
              {c.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{c.name}</span>
              {c.budgetCents ? (
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t.budgetPerMonth(formatEUR(c.budgetCents))}</span>
              ) : null}
            </span>
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
          </button>
        </li>
      ))}
    </ul>
  )
}
