import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import Card from '../../components/Card'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import Toast from '../../components/Toast'
import { db, resetAllData } from '../../db'
import { useOverlayBack } from '../../hooks/useOverlayBack'
import { loadDemoData } from '../../lib/demoData'
import { exportCSV, exportJSON, importBackup, parseBackup } from '../../lib/exportImport'
import { useT } from '../../lib/i18n'

type Backup = ReturnType<typeof parseBackup>

const button =
  'h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'

/** Sub-page: backup (export/import) first; rarely needed and risky things sit behind "Erweitert". */
export default function DataPage({ onBack }: { onBack: () => void }) {
  const t = useT()
  const entryCount = useLiveQuery(() => db.expenses.count(), []) ?? 0
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false) // second step before "replace everything"
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [advanced, setAdvanced] = useState(false)
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
    setConfirmReplace(false)
    setMessage(t.importDone(added, mode === 'replace'))
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t.settingsData} onBack={onBack} />

      <Card title={t.backupTitle}>
        <div className="space-y-2">
          <button className={button} onClick={exportJSON}>{t.exportJson}</button>
          <button className={button} onClick={exportCSV}>{t.exportCsv}</button>
          <button className={button} onClick={() => fileInput.current?.click()}>{t.importJson}</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
        </div>
      </Card>

      {/* Rarely needed or risky: collapsed by default and visually separated from the backup buttons */}
      <button
        onClick={() => setAdvanced((a) => !a)}
        aria-expanded={advanced}
        className="flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-medium text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
      >
        <span>{t.advanced}</span>
        <span className={`transition-transform ${advanced ? 'rotate-90' : ''}`}>›</span>
      </button>

      {advanced && (
        <>
          <Card title={t.demoTitle}>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t.demoWarning}</p>
            <button className={button} onClick={async () => setMessage(t.demoLoaded(await loadDemoData()))}>
              {t.loadDemo}
            </button>
          </Card>

          <section className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/40">
            <h2 className="mb-1 font-semibold text-red-700 dark:text-red-300">{t.dangerZone}</h2>
            <p className="mb-3 text-sm text-red-700/80 dark:text-red-300/80">{t.dangerInfo}</p>
            <button
              className="h-12 w-full rounded-xl bg-red-600 px-4 text-left font-medium text-white active:bg-red-700"
              onClick={() => setConfirmWipe(true)}
            >
              {t.deleteAll}
            </button>
          </section>
        </>
      )}

      {pendingImport && !confirmReplace && (
        <ImportDialog
          entries={pendingImport.expenses.length}
          categories={pendingImport.categories.length}
          onMerge={() => runImport('merge')}
          onReplace={() => setConfirmReplace(true)}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {pendingImport && confirmReplace && (
        <ConfirmDialog
          title={t.replaceTitle}
          message={t.replaceMsg(entryCount, pendingImport.expenses.length)}
          requireText={t.replaceWord}
          confirmLabel={t.replace}
          onConfirm={() => runImport('replace')}
          onCancel={() => setConfirmReplace(false)}
        />
      )}

      {confirmWipe && (
        <ConfirmDialog
          title={t.wipeTitle}
          message={t.wipeMsg}
          requireText={t.wipeWord}
          confirmLabel={t.wipeConfirm}
          enableAfterSeconds={3}
          onConfirm={async () => {
            await resetAllData()
            setConfirmWipe(false)
            setMessage(t.wipeDone)
          }}
          onCancel={() => setConfirmWipe(false)}
        >
          <button onClick={exportJSON} className={`${button} mt-3`}>
            {t.exportFirst}
          </button>
        </ConfirmDialog>
      )}

      {message && <Toast message={message} onClose={() => setMessage('')} />}
    </div>
  )
}

/** Choose what to do with the backup file: merging is the safe default, replacing needs a second confirmation. */
function ImportDialog(props: { entries: number; categories: number; onMerge: () => void; onReplace: () => void; onCancel: () => void }) {
  const t = useT()
  useOverlayBack(props.onCancel)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={props.onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">{t.importTitle}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.importInfo(props.entries, props.categories)}</p>
        <div className="mt-5 space-y-2">
          <button onClick={props.onMerge} className="h-12 w-full rounded-xl bg-indigo-600 font-medium text-white active:bg-indigo-700">
            {t.merge}
          </button>
          <button onClick={props.onCancel} className="h-12 w-full rounded-xl bg-slate-100 font-medium dark:bg-slate-800">
            {t.cancel}
          </button>
        </div>
        <button
          onClick={props.onReplace}
          className="mt-4 h-11 w-full rounded-xl text-sm font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950"
        >
          {t.replaceAll}
        </button>
      </div>
    </div>
  )
}
