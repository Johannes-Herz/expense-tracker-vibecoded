import { db, type Category, type Expense, type Setting } from '../db'
import { centsToInput, formatDate } from './format'

interface Backup {
  app: 'ExpenseTracker'
  version: 1
  exportedAt: string
  categories: Category[]
  expenses: Expense[]
  settings: Setting[]
}

function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

/** CSV for Excel (German): ";" separator, decimal comma, UTF-8 BOM. */
export async function exportCSV() {
  const [expenses, categories] = await Promise.all([db.expenses.orderBy('date').toArray(), db.categories.toArray()])
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = [
    ['Datum', 'Betrag (EUR)', 'Kategorie', 'Notiz'].join(';'),
    ...expenses.map((e) =>
      [formatDate(e.date), centsToInput(e.amountCents), cell(names.get(e.categoryId) ?? ''), cell(e.note ?? '')].join(';'),
    ),
  ]
  download(`ausgaben-${stamp()}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8')
}

export async function exportJSON() {
  const backup: Backup = {
    app: 'ExpenseTracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    expenses: await db.expenses.toArray(),
    settings: await db.settings.toArray(),
  }
  download(`expensetracker-backup-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json')
}

/** Parses and validates a backup file. Throws an Error with a readable message if it is not valid. */
export function parseBackup(text: string): Backup {
  let data: Partial<Backup>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (data.app !== 'ExpenseTracker' || !Array.isArray(data.categories) || !Array.isArray(data.expenses)) {
    throw new Error('Das ist keine ExpenseTracker-Sicherung.')
  }
  const okCategory = (c: Category) => typeof c.id === 'number' && typeof c.name === 'string'
  const okExpense = (e: Expense) =>
    typeof e.amountCents === 'number' && typeof e.categoryId === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  if (!data.categories.every(okCategory) || !data.expenses.every(okExpense)) {
    throw new Error('Die Sicherung enthält ungültige Daten.')
  }
  return { ...(data as Backup), settings: Array.isArray(data.settings) ? data.settings : [] }
}

/**
 * Restore a backup.
 * - replace: wipe everything, then load the backup 1:1.
 * - merge: keep existing data; categories are matched by name, duplicate expenses are skipped.
 * Returns how many expenses were added.
 */
export async function importBackup(backup: Backup, mode: 'replace' | 'merge'): Promise<number> {
  return db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.expenses.clear(), db.categories.clear(), db.settings.clear()])
      await db.categories.bulkAdd(backup.categories)
      await db.expenses.bulkAdd(backup.expenses)
      await db.settings.bulkAdd(backup.settings)
      return backup.expenses.length
    }

    // merge: map backup category ids to ids in this database
    const existing = await db.categories.toArray()
    const idMap = new Map<number, number>()
    for (const c of backup.categories) {
      const match = existing.find((x) => x.name.toLowerCase() === c.name.toLowerCase())
      if (match) idMap.set(c.id, match.id)
      else {
        const { id: _oldId, ...rest } = c
        idMap.set(c.id, await db.categories.add(rest as Category))
      }
    }

    const key = (e: Pick<Expense, 'date' | 'amountCents' | 'categoryId' | 'note' | 'createdAt'>) =>
      [e.date, e.amountCents, e.categoryId, e.note ?? '', e.createdAt].join('|')
    const known = new Set((await db.expenses.toArray()).map(key))

    const toAdd: Omit<Expense, 'id'>[] = []
    for (const e of backup.expenses) {
      const categoryId = idMap.get(e.categoryId)
      if (categoryId === undefined) continue
      const { id: _oldId, ...rest } = e
      const next = { ...rest, categoryId }
      if (known.has(key(next))) continue
      known.add(key(next))
      toAdd.push(next)
    }
    await db.expenses.bulkAdd(toAdd as Expense[])
    return toAdd.length
  })
}
