// Low-level access to the public backup folder Documents/ExpenseTracker (Android app only).
//
// Android storage rules: on Android 11+ the app may create files in the public Documents folder without any
// permission, but later only sees/changes files IT created. After an uninstall + reinstall the new install is a
// different "owner": it can usually neither list, read, overwrite nor delete the old files. Therefore:
//   - restoring always goes through the system file picker (works for any file),
//   - cleanup only touches what we can see and ignores every error.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

export const BACKUP_DIR = 'ExpenseTracker'
export const BACKUP_DIR_LABEL = 'Documents/ExpenseTracker'
const FILE_RE = /^expense-tracker-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/

export interface StoredBackup {
  name: string
  mtime: number
}

/** Android 10 and older need a runtime permission for the public Documents folder; newer versions need none. */
async function ensurePermission() {
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage !== 'granted') await Filesystem.requestPermissions()
  } catch {
    // Not supported / not needed: the write below reports the real problem.
  }
}

export async function writeBackupFile(name: string, content: string) {
  await ensurePermission()
  await Filesystem.writeFile({
    path: `${BACKUP_DIR}/${name}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

/** Backup files this install can see, newest first. Returns [] if the folder does not exist or is not readable. */
export async function listBackupFiles(): Promise<StoredBackup[]> {
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
    return files
      .filter((f) => f.type === 'file' && FILE_RE.test(f.name))
      .map((f) => ({ name: f.name, mtime: f.mtime ?? 0 }))
      .sort((a, b) => b.name.localeCompare(a.name)) // the timestamp is in the name
  } catch {
    return []
  }
}

/** Deletes one file; false when that is not allowed (e.g. a file of a previous install). Never throws. */
export async function deleteBackupFile(name: string): Promise<boolean> {
  try {
    await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${name}`, directory: Directory.Documents })
    return true
  } catch {
    return false
  }
}
