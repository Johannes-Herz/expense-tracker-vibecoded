import { useState } from 'react'
import { autoBackup, useBackupState } from '../lib/autoBackupSetup'
import { BACKUP_DIR_LABEL } from '../lib/backupStorage'
import { formatDateTime } from '../lib/format'
import { useT } from '../lib/i18n'
import Card from './Card'

/** Android app only: status of the automatic backups in Documents/ExpenseTracker and the "back up now" button. */
export default function AutoBackupCard({ onMessage }: { onMessage: (message: string) => void }) {
  const t = useT()
  const { lastSuccess, error } = useBackupState()
  const [busy, setBusy] = useState(false)

  async function backupNow() {
    setBusy(true)
    const wrote = await autoBackup.backupNow()
    setBusy(false)
    if (wrote) onMessage(t.autoBackupDone)
    else if (!autoBackup.getState().error) onMessage(t.autoBackupUnchanged)
  }

  return (
    <>
      {error && (
        <section className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/40">
          <h2 className="font-semibold text-red-700 dark:text-red-300">{t.autoBackupFailedTitle}</h2>
          <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">{t.autoBackupFailedInfo}</p>
          <p className="mt-1 break-words text-xs text-red-700/70 dark:text-red-300/70">{error}</p>
        </section>
      )}
      <Card title={t.autoBackupTitle}>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.autoBackupInfo}</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">{t.autoBackupFolder}</dt>
            <dd className="font-mono text-xs">{BACKUP_DIR_LABEL}</dd>
          </div>
          <div>{lastSuccess ? t.autoBackupLast(formatDateTime(lastSuccess)) : t.autoBackupNever}</div>
        </dl>
        <button
          disabled={busy}
          onClick={backupNow}
          className="mt-3 h-12 w-full rounded-xl bg-slate-100 px-4 text-left font-medium transition-colors active:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:active:bg-slate-700"
        >
          {t.autoBackupNow}
        </button>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t.autoBackupOldFiles}</p>
      </Card>
    </>
  )
}
