import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ReactNode } from 'react'
import CategoryEditor from '../components/CategoryEditor'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  getSetting,
  resetAllData,
  setSetting,
  SETTING_LANGUAGE,
  SETTING_THEME,
  SETTING_TREND_THRESHOLD,
  type Category,
  type EntryType,
} from '../db'
import { useCategories, useTrendThreshold } from '../hooks/useData'
import { loadDemoData } from '../lib/demoData'
import { exportCSV, exportJSON, importBackup, parseBackup } from '../lib/exportImport'
import { formatEUR } from '../lib/format'
import { LANGUAGES, setLanguageCache, useT, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import { clampThreshold } from '../lib/trends'

type Backup = ReturnType<typeof parseBackup>

export default function SettingsScreen() {
  const t = useT()
  const categories = useCategories()
  const theme = useLiveQuery(() => getSetting<Theme>(SETTING_THEME), []) ?? 'system'
  const trendThreshold = useTrendThreshold()
  const lang = useLiveQuery(() => getSetting<Lang>(SETTING_LANGUAGE), []) ?? 'de'

  // null = closed, Category = editing, { newType } = adding a category of that type
  const [editing, setEditing] = useState<Category | { newType: EntryType } | null>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function onFileChosen(file: File | undefined) {
    if (!file) return
    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (err) {
      setMessage((err as Error).message)
    }
    if (fileInput.current) fileInput.current.value = '' // allow choosing the same file again
  }

  async function runImport(mode: 'replace' | 'merge') {
    if (!pendingImport) return
    const added = await importBackup(pendingImport, mode)
    setPendingImport(null)
    setMessage(t.importDone(added, mode === 'replace'))
  }

  const THEMES: { id: Theme; label: string }[] = [
    { id: 'system', label: t.themeSystem },
    { id: 'light', label: t.themeLight },
    { id: 'dark', label: t.themeDark },
  ]
  const button =
    'h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-2xl font-bold">{t.settingsTitle}</h1>

      {message && (
        <div className="flex items-start justify-between gap-2 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label={t.close}>✕</button>
        </div>
      )}

      <Section title={t.appearance}>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => setSetting(SETTING_THEME, th.id)}
              className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
                theme === th.id ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
        <div className="mb-1.5 mt-4 text-sm text-slate-500 dark:text-slate-400">{t.language}</div>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLanguageCache(l.id)
                void setSetting(SETTING_LANGUAGE, l.id)
              }}
              aria-pressed={lang === l.id}
              className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
                lang === l.id ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.expenseCategories}>
        <CategoryList categories={categories.filter((c) => c.type === 'expense')} onSelect={setEditing} />
        <button onClick={() => setEditing({ newType: 'expense' })} className={`${button} mt-3 text-indigo-600 dark:text-indigo-400`}>
          {t.addCategory}
        </button>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.budgetHint}</p>
      </Section>

      <Section title={t.incomeCategories}>
        <CategoryList categories={categories.filter((c) => c.type === 'income')} onSelect={setEditing} />
        <button onClick={() => setEditing({ newType: 'income' })} className={`${button} mt-3 text-indigo-600 dark:text-indigo-400`}>
          {t.addCategory}
        </button>
      </Section>

      <Section title={t.trendSettingsTitle}>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t.trendThresholdLabel}</span>
          <input
            key={trendThreshold} // re-created after saving so the field shows the clamped value
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            defaultValue={trendThreshold}
            onBlur={(e) => setSetting(SETTING_TREND_THRESHOLD, clampThreshold(Math.round(Number(e.target.value))))}
            className="h-12 w-24 rounded-xl bg-slate-100 px-3 text-center outline-none dark:bg-slate-800"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.trendThresholdHint}</p>
      </Section>

      <Section title={t.data}>
        <div className="space-y-2">
          <button className={button} onClick={exportCSV}>{t.exportCsv}</button>
          <button className={button} onClick={exportJSON}>{t.exportJson}</button>
          <button className={button} onClick={() => fileInput.current?.click()}>{t.importJson}</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          <button
            className={button}
            onClick={async () => setMessage(t.demoLoaded(await loadDemoData()))}
          >
            {t.loadDemo}
          </button>
          <button
            className="h-12 w-full rounded-xl bg-red-50 px-4 text-left font-medium text-red-600 active:bg-red-100 dark:bg-red-950 dark:active:bg-red-900"
            onClick={() => setConfirmWipe(true)}
          >
            {t.deleteAll}
          </button>
        </div>
      </Section>

      {editing && (
        <CategoryEditor
          key={'id' in editing ? editing.id : editing.newType}
          category={'id' in editing ? editing : undefined}
          type={'newType' in editing ? editing.newType : undefined}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setPendingImport(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{t.importTitle}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t.importInfo(pendingImport.expenses.length, pendingImport.categories.length)}
            </p>
            <div className="mt-5 space-y-2">
              <button onClick={() => runImport('merge')} className="h-12 w-full rounded-xl bg-indigo-600 font-medium text-white active:bg-indigo-700">
                {t.merge}
              </button>
              <button onClick={() => runImport('replace')} className="h-12 w-full rounded-xl bg-red-600 font-medium text-white active:bg-red-700">
                {t.replace}
              </button>
              <button onClick={() => setPendingImport(null)} className="h-12 w-full rounded-xl bg-slate-100 font-medium dark:bg-slate-800">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmWipe && (
        <ConfirmDialog
          title={t.wipeTitle}
          message={t.wipeMsg}
          requireText={t.wipeWord}
          confirmLabel={t.wipeConfirm}
          onConfirm={async () => {
            await resetAllData()
            setConfirmWipe(false)
            setMessage(t.wipeDone)
          }}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  )
}

function CategoryList({ categories, onSelect }: { categories: Category[]; onSelect: (c: Category) => void }) {
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}
