// TEMPORARY (storage spike): checks what the app may do in Documents/ExpenseTracker on this phone.
// Removed again when the real backup UI exists.
import { Directory, Filesystem } from '@capacitor/filesystem'
import { useState } from 'react'
import { BACKUP_DIR, deleteBackupFile, listBackupFiles, writeBackupFile } from '../lib/backupStorage'
import { buildBackup, serializeBackup } from '../lib/exportImport'

const btn = 'h-11 w-full rounded-xl bg-slate-100 px-4 text-left text-sm font-medium active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'
const pad = (n: number) => String(n).padStart(2, '0')

export default function StorageSpike() {
  const [log, setLog] = useState('')
  const add = (line: string) => setLog((l) => `${l}${line}\n`)

  async function write() {
    const d = new Date()
    const name = `expense-tracker-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`
    try {
      await writeBackupFile(name, serializeBackup(await buildBackup()))
      add(`WRITE ok: ${name}`)
    } catch (e) {
      add(`WRITE FAILED: ${(e as Error).message}`)
    }
  }

  async function list() {
    const files = await listBackupFiles()
    add(`LIST: ${files.length} file(s)`)
    for (const f of files) {
      let read = 'read ok'
      try {
        const r = await Filesystem.readFile({ path: `${BACKUP_DIR}/${f.name}`, directory: Directory.Documents })
        read = `read ok (${String(r.data).length} chars)`
      } catch (e) {
        read = `READ FAILED: ${(e as Error).message}`
      }
      add(` - ${f.name}: ${read}`)
    }
    try {
      const raw = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
      add(`raw readdir: ${raw.files.length} entries`)
    } catch (e) {
      add(`raw readdir FAILED: ${(e as Error).message}`)
    }
  }

  async function removeOldest() {
    const files = await listBackupFiles()
    const oldest = files[files.length - 1]
    if (!oldest) return add('DELETE: nothing to delete')
    add(`DELETE ${oldest.name}: ${(await deleteBackupFile(oldest.name)) ? 'ok' : 'FAILED'}`)
  }

  return (
    <section className="space-y-2 rounded-2xl border-2 border-amber-300 p-4">
      <h2 className="font-semibold">Speicher-Test (temporär)</h2>
      <button className={btn} onClick={write}>1. Backup-Datei schreiben</button>
      <button className={btn} onClick={list}>2. Ordner auflisten + lesen</button>
      <button className={btn} onClick={removeOldest}>3. Älteste Datei löschen</button>
      {log && <pre className="whitespace-pre-wrap break-all text-xs">{log}</pre>}
    </section>
  )
}
