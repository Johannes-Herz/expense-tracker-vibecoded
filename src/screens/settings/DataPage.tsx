import { useRef, useState } from 'react'
import Card from '../../components/Card'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import Toast from '../../components/Toast'
import { resetAllData } from '../../db'
import { loadDemoData } from '../../lib/demoData'
import { exportCSV, exportJSON, importBackup, parseBackup } from '../../lib/exportImport'
import { useT } from '../../lib/i18n'

type Backup = ReturnType<typeof parseBackup>

const button =
  'h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'

/** Sub-page: export, import, demo data and deleting everything. */
export default function DataPage({ onBack }: { onBack: () => void }) {
  const t = useT()
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

  return (
    <div className="space-y-4">
      <PageHeader title={t.settingsData} onBack={onBack} />

      <Card title={t.data}>
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
          <button className={button} onClick={async () => setMessage(t.demoLoaded(await loadDemoData()))}>
            {t.loadDemo}
          </button>
          <button
            className="h-12 w-full rounded-xl bg-red-50 px-4 text-left font-medium text-red-600 active:bg-red-100 dark:bg-red-950 dark:active:bg-red-900"
            onClick={() => setConfirmWipe(true)}
          >
            {t.deleteAll}
          </button>
        </div>
      </Card>

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

      {message && <Toast message={message} onClose={() => setMessage('')} />}
    </div>
  )
}
