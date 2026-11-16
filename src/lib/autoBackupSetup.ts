// Wires the backup engine to the real app: Dexie change hooks, the app going to the background, Android storage.
import { App } from '@capacitor/app'
import { useSyncExternalStore } from 'react'
import { db } from '../db'
import { createAutoBackup } from './autoBackup'
import { deleteBackupFile, listBackupFiles, writeBackupFile } from './backupStorage'
import { buildBackup } from './exportImport'
import { isNative } from './platform'

const store = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // storage unavailable: the backup still works, it just cannot remember what it wrote
    }
  },
}

export const autoBackup = createAutoBackup({
  build: buildBackup,
  write: writeBackupFile,
  list: listBackupFiles,
  remove: deleteBackupFile,
  store,
})

/** Start watching data changes (Android app only). Call once at startup. */
export function startAutoBackup() {
  if (!isNative) return
  for (const table of [db.expenses, db.recurring, db.categories, db.settings]) {
    table.hook('creating', () => void autoBackup.schedule())
    table.hook('updating', () => void autoBackup.schedule())
    table.hook('deleting', () => void autoBackup.schedule())
  }
  // Going to the background: write right away, the app may be closed afterwards.
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) void autoBackup.flush()
  })
  autoBackup.schedule() // first start / data changed while the app was closed (no-op when nothing changed)
}

/** React hook for the settings page: last success time and last error. */
export function useBackupState() {
  return useSyncExternalStore(autoBackup.subscribe, autoBackup.getState)
}
