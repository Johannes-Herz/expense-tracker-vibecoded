import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import CategoryEditor from '../components/CategoryEditor'
import ConfirmDialog from '../components/ConfirmDialog'
import ExpenseForm from '../components/ExpenseForm'
import {
  db,
  getSetting,
  resetAllData,
  setRecurringPaused,
  setSetting,
  SETTING_BUDGET,
  SETTING_THEME,
  type Category,
  type RecurringExpense,
} from '../db'
import { useBudget, useCategories } from '../hooks/useData'
import { loadDemoData } from '../lib/demoData'
import { exportCSV, exportJSON, importBackup, parseBackup } from '../lib/exportImport'
import { today } from '../lib/dates'
import { centsToInput, formatDate, formatEUR, formatSchedule, parseAmountToCents } from '../lib/format'
import { nextOccurrence } from '../lib/recurrence'
import type { Theme } from '../lib/theme'

type Backup = ReturnType<typeof parseBackup>

export default function SettingsScreen() {
  const categories = useCategories()
  const budget = useBudget()
  const theme = useLiveQuery(() => getSetting<Theme>(SETTING_THEME), []) ?? 'system'

  const [budgetText, setBudgetText] = useState('')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const series = useLiveQuery(() => db.recurring.filter((r) => r.type === 'expense').toArray(), []) ?? []
  // null = closed, 'new' = adding a series, RecurringExpense = editing one
  const [editingSeries, setEditingSeries] = useState<RecurringExpense | 'new' | null>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  // Show the saved budget in the input once it has loaded.
  useEffect(() => setBudgetText(budget ? centsToInput(budget) : ''), [budget])

  async function saveBudget() {
    const cents = parseAmountToCents(budgetText)
    await setSetting(SETTING_BUDGET, cents ?? undefined)
    setMessage(cents ? 'Budget gespeichert.' : 'Budget entfernt.')
  }

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
    setMessage(`Import abgeschlossen: ${added} Ausgaben ${mode === 'replace' ? 'geladen' : 'hinzugefügt'}.`)
  }

  const THEMES: { id: Theme; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Hell' },
    { id: 'dark', label: 'Dunkel' },
  ]
  const button =
    'h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-2xl font-bold">Einstellungen</h1>

      {message && (
        <div className="flex items-start justify-between gap-2 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label="Schließen">✕</button>
        </div>
      )}

      <Section title="Darstellung">
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSetting(SETTING_THEME, t.id)}
              className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
                theme === t.id ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Monatsbudget">
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            placeholder="Kein Budget"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl bg-slate-100 px-4 outline-none placeholder:text-slate-400 dark:bg-slate-800"
          />
          <span className="flex items-center text-slate-500">€</span>
          <button onClick={saveBudget} className="h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white active:bg-indigo-700">
            Speichern
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Feld leeren und speichern, um das Budget zu entfernen.</p>
      </Section>

      <Section title="Kategorien">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => setEditing(c)} className="flex min-h-14 w-full items-center gap-3 text-left">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                  style={{ backgroundColor: `${c.color}26` }}
                >
                  {c.emoji}
                </span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => setEditing('new')} className={`${button} mt-3 text-indigo-600 dark:text-indigo-400`}>
          + Kategorie hinzufügen
        </button>
      </Section>

      <Section title="Wiederkehrende Ausgaben">
        {series.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Noch keine. Miete, Abos oder Versicherungen werden automatisch als Ausgaben angelegt.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {series.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId)
              const next = nextOccurrence(r, today())
              const status = r.paused ? 'pausiert' : next ? `nächste: ${formatDate(next)}` : 'beendet'
              return (
                <li key={r.id} className="flex items-center gap-2">
                  <button onClick={() => setEditingSeries(r)} className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 text-left ${r.paused ? 'opacity-60' : ''}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ backgroundColor: `${cat?.color ?? '#64748b'}26` }}>
                      {cat?.emoji ?? '❓'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.note || cat?.name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatSchedule(r.frequency, r.interval)} · {status}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatEUR(r.amountCents)}</span>
                  </button>
                  <button
                    onClick={() => setRecurringPaused(r.id, !r.paused)}
                    aria-label={r.paused ? 'Fortsetzen' : 'Pausieren'}
                    title={r.paused ? 'Fortsetzen' : 'Pausieren'}
                    className="h-11 w-11 shrink-0 rounded-full text-lg active:bg-slate-100 dark:active:bg-slate-800"
                  >
                    {r.paused ? '▶️' : '⏸️'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button onClick={() => setEditingSeries('new')} className={`${button} mt-3 text-indigo-600 dark:text-indigo-400`}>
          + Wiederkehrende Ausgabe
        </button>
      </Section>

      <Section title="Daten">
        <div className="space-y-2">
          <button className={button} onClick={exportCSV}>📄 Export als CSV</button>
          <button className={button} onClick={exportJSON}>💾 Sicherung (JSON) exportieren</button>
          <button className={button} onClick={() => fileInput.current?.click()}>📥 Sicherung (JSON) importieren</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          <button
            className={button}
            onClick={async () => setMessage(`${await loadDemoData()} Demo-Ausgaben hinzugefügt.`)}
          >
            🎲 Demo-Daten laden
          </button>
          <button
            className="h-12 w-full rounded-xl bg-red-50 px-4 text-left font-medium text-red-600 active:bg-red-100 dark:bg-red-950 dark:active:bg-red-900"
            onClick={() => setConfirmWipe(true)}
          >
            🗑️ Alle Daten löschen
          </button>
        </div>
      </Section>

      {editing && <CategoryEditor category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

      {editingSeries && (
        <ExpenseForm
          series={editingSeries === 'new' ? undefined : editingSeries}
          startRecurring={editingSeries === 'new'}
          categories={categories}
          onClose={() => setEditingSeries(null)}
        />
      )}

      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setPendingImport(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Sicherung importieren</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Die Datei enthält {pendingImport.expenses.length} Ausgaben und {pendingImport.categories.length} Kategorien.
              Ersetzen löscht alle aktuellen Daten, Zusammenführen behält sie und überspringt Duplikate.
            </p>
            <div className="mt-5 space-y-2">
              <button onClick={() => runImport('merge')} className="h-12 w-full rounded-xl bg-indigo-600 font-medium text-white active:bg-indigo-700">
                Zusammenführen
              </button>
              <button onClick={() => runImport('replace')} className="h-12 w-full rounded-xl bg-red-600 font-medium text-white active:bg-red-700">
                Ersetzen
              </button>
              <button onClick={() => setPendingImport(null)} className="h-12 w-full rounded-xl bg-slate-100 font-medium dark:bg-slate-800">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmWipe && (
        <ConfirmDialog
          title="Alle Daten löschen?"
          message="Alle Ausgaben, Kategorien und Einstellungen werden unwiderruflich gelöscht. Erstelle vorher eine Sicherung!"
          requireText="LÖSCHEN"
          confirmLabel="Alles löschen"
          onConfirm={async () => {
            await resetAllData()
            setConfirmWipe(false)
            setMessage('Alle Daten wurden gelöscht.')
          }}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
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
