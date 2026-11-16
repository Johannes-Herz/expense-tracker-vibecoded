// Automatic backups into the public folder Documents/ExpenseTracker (Android app only).
//
// - Every data change (any table) schedules a backup after a quiet period (debounce); going to the background
//   writes immediately; "Backup now" in the settings does too.
// - A backup is only written when the data really changed since the last one (hash of the backup content
//   without its timestamp). Hash, time and error are kept in localStorage, NOT in the database, so writing a
//   backup is never a data change itself.
// - Only the newest MAX_BACKUPS files this install can see are kept (see backupStorage.ts for why that is).
// The engine takes its dependencies as parameters so it can be unit-tested without Android.
import type { Backup } from './exportImport'

export const MAX_BACKUPS = 3
export const DEBOUNCE_MS = 5000

export interface BackupState {
  lastSuccess: string | null // ISO time of the last successful backup
  error: string | null // message of the last failed attempt (cleared by the next success)
}

export interface BackupDeps {
  build: () => Promise<Backup>
  write: (name: string, content: string) => Promise<void>
  list: () => Promise<{ name: string }[]> // newest first
  remove: (name: string) => Promise<boolean>
  store: { get(key: string): string | null; set(key: string, value: string | null): void }
  now?: () => Date
  debounceMs?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function backupFileName(d: Date) {
  return `expense-tracker-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`
}

/** Content fingerprint that ignores the export timestamp. */
export async function backupHash(backup: Backup): Promise<string> {
  const text = JSON.stringify({ ...backup, exportedAt: '' })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const K_HASH = 'autoBackupHash'
const K_LAST = 'autoBackupLast'
const K_ERROR = 'autoBackupError'

export function createAutoBackup(deps: BackupDeps) {
  const now = deps.now ?? (() => new Date())
  const delay = deps.debounceMs ?? DEBOUNCE_MS
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | null = null
  let again = false // changes arrived while a backup was running
  let state: BackupState = { lastSuccess: deps.store.get(K_LAST), error: deps.store.get(K_ERROR) }

  const setState = (next: BackupState) => {
    state = next
    listeners.forEach((l) => l())
  }

  /** Keep the newest MAX_BACKUPS files; whatever cannot be deleted is ignored. */
  async function cleanup() {
    try {
      const files = await deps.list()
      for (const f of files.slice(MAX_BACKUPS)) await deps.remove(f.name)
    } catch {
      // Cleanup must never turn a successful backup into an error.
    }
  }

  async function runOnce(): Promise<boolean> {
    try {
      const backup = await deps.build()
      const hash = await backupHash(backup)
      if (hash === deps.store.get(K_HASH)) return false // nothing changed since the last backup
      await deps.write(backupFileName(now()), JSON.stringify(backup, null, 2))
      deps.store.set(K_HASH, hash)
      deps.store.set(K_LAST, now().toISOString())
      deps.store.set(K_ERROR, null)
      setState({ lastSuccess: now().toISOString(), error: null })
      await cleanup()
      return true
    } catch (e) {
      const message = (e as Error)?.message || String(e)
      deps.store.set(K_ERROR, message)
      setState({ ...state, error: message })
      return false
    }
  }

  /** Writes a backup now (if the data changed). Runs never overlap; a change during a run triggers one more. */
  async function flush(): Promise<boolean> {
    clearTimeout(timer)
    timer = undefined
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      let wrote = await runOnce()
      while (again) {
        again = false
        wrote = (await runOnce()) || wrote
      }
      return wrote
    })().finally(() => {
      running = null
    })
    return running
  }

  return {
    /** A data change happened: back up after a quiet period. */
    schedule() {
      if (running) again = true
      clearTimeout(timer)
      timer = setTimeout(() => void flush(), delay)
    },
    flush,
    /** The "Backup now" button: also reports whether a file was written (false = nothing changed or it failed). */
    backupNow: flush,
    getState: () => state,
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export type AutoBackup = ReturnType<typeof createAutoBackup>
