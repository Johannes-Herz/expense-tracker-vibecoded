import { useState } from 'react'
import CategoryEditor from '../../components/CategoryEditor'
import CategoryList from '../../components/CategoryList'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import type { Category, EntryType } from '../../db'
import { useCategories } from '../../hooks/useData'
import { useT } from '../../lib/i18n'

const addButton =
  'mt-3 h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium text-indigo-600 transition-colors active:bg-slate-200 dark:bg-slate-800 dark:text-indigo-400 dark:active:bg-slate-700'

/** Sub-page: all expense and income categories (edit, add). */
export default function CategoriesPage({ onBack }: { onBack: () => void }) {
  const t = useT()
  const categories = useCategories()
  const [type, setType] = useState<EntryType>('expense')
  // null = closed, Category = editing, { newType } = adding a category of that type
  const [editing, setEditing] = useState<Category | { newType: EntryType } | null>(null)

  return (
    <div className="space-y-4">
      <PageHeader title={t.settingsCategories} onBack={onBack}>
        <div role="tablist" className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['expense', 'income'] as const).map((ty) => (
            <button
              key={ty}
              role="tab"
              aria-selected={type === ty}
              onClick={() => setType(ty)}
              className={`h-9 flex-1 rounded-lg text-sm font-medium transition-colors ${
                type === ty ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {ty === 'expense' ? t.expenses : t.incomes}
            </button>
          ))}
        </div>
      </PageHeader>

      <Card>
        <CategoryList categories={categories.filter((c) => c.type === type)} onSelect={setEditing} />
        <button onClick={() => setEditing({ newType: type })} className={addButton}>
          {t.addCategory}
        </button>
        {type === 'expense' && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.budgetHint}</p>}
      </Card>

      {editing && (
        <CategoryEditor
          key={'id' in editing ? editing.id : editing.newType}
          category={'id' in editing ? editing : undefined}
          type={'newType' in editing ? editing.newType : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
