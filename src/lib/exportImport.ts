import { db, type Category, type Expense, type RecurringExpense, type Setting } from '../db'
import { centsToInput, formatDate } from './format'

interface Backup {
  app: 'ExpenseTracker'
  version: 1 | 2 // 2 added `recurring`; version 1 backups still import
  exportedAt: string
  categories: Category[]
  expenses: Expense[]
  recurring: RecurringExpense[]
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
    ['Datum', 'Betrag (EUR)', 'Kategorie', 'Notiz', 'Wiederkehrend'].join(';'),
    ...expenses.map((e) =>
      [formatDate(e.date), centsToInput(e.amountCents), cell(names.get(e.categoryId) ?? ''), cell(e.note ?? ''), e.recurringId === undefined ? 'Nein' : 'Ja'].join(';'),
    ),
  ]
  download(`ausgaben-${stamp()}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8')
}

export async function exportJSON() {
  const backup: Backup = {
    app: 'ExpenseTracker',
    version: 2,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    expenses: await db.expenses.toArray(),
    recurring: await db.recurring.toArray(),
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
  const recurring = Array.isArray(data.recurring) ? data.recurring : []
  const okRecurring = (r: RecurringExpense) =>
    typeof r.id === 'number' &&
    typeof r.amountCents === 'number' &&
    typeof r.categoryId === 'number' &&
    ['daily', 'weekly', 'monthly', 'yearly'].includes(r.frequency) &&
    Number.isInteger(r.interval) &&
    r.interval >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.startDate)
  if (!recurring.every(okRecurring)) throw new Error('Die Sicherung enthält ungültige Daten.')
  return { ...(data as Backup), recurring, settings: Array.isArray(data.settings) ? data.settings : [] }
}

/**
 * Restore a backup.
 * - replace: wipe everything, then load the backup 1:1.
 * - merge: keep existing data; categories are matched by name, duplicate expenses are skipped.
 * Returns how many expenses were added.
 */
export async function importBackup(backup: Backup, mode: 'replace' | 'merge'): Promise<number> {
  return db.transaction('rw', db.expenses, db.recurring, db.categories, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.expenses.clear(), db.recurring.clear(), db.categories.clear(), db.settings.clear()])
      await db.categories.bulkAdd(backup.categories)
      await db.recurring.bulkAdd(backup.recurring)
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

    // merge series: reuse an identical existing series (keeping the later cursor), else add it
    const seriesKey = (r: RecurringExpense) =>
      [r.note ?? '', r.amountCents, r.categoryId, r.frequency, r.interval, r.startDate, r.endDate ?? ''].join('|')
    const existingSeries = await db.recurring.toArray()
    const seriesMap = new Map<number, number>()
    for (const r of backup.recurring) {
      const mapped = { ...r, categoryId: idMap.get(r.categoryId) ?? r.categoryId }
      const match = existingSeries.find((x) => seriesKey(x) === seriesKey(mapped))
      if (match) {
        seriesMap.set(r.id, match.id)
        const cursor = [match.generatedThrough, r.generatedThrough].filter(Boolean).sort().pop()
        if (cursor !== match.generatedThrough) await db.recurring.update(match.id, { generatedThrough: cursor })
      } else {
        const { id: _oldId, ...rest } = mapped
        seriesMap.set(r.id, await db.recurring.add(rest as RecurringExpense))
      }
    }

    const key = (e: Pick<Expense, 'date' | 'amountCents' | 'categoryId' | 'note' | 'createdAt'>) =>
      [e.date, e.amountCents, e.categoryId, e.note ?? '', e.createdAt].join('|')
    const occKey = (e: Pick<Expense, 'recurringId' | 'occurrenceDate'>) => `${e.recurringId}|${e.occurrenceDate}`
    const all = await db.expenses.toArray()
    const known = new Set(all.map(key))
    const knownOcc = new Set(all.filter((e) => e.recurringId !== undefined).map(occKey))

    const toAdd: Omit<Expense, 'id'>[] = []
    for (const e of backup.expenses) {
      const categoryId = idMap.get(e.categoryId)
      if (categoryId === undefined) continue
      const { id: _oldId, ...rest } = e
      const next: Omit<Expense, 'id'> = { ...rest, categoryId }
      if (e.recurringId !== undefined) {
        const newSeries = seriesMap.get(e.recurringId)
        if (newSeries === undefined) {
          delete next.recurringId // series missing from the backup: keep as a normal expense
          delete next.occurrenceDate
        } else {
          next.recurringId = newSeries
          if (knownOcc.has(occKey(next))) continue // that occurrence already exists
          knownOcc.add(occKey(next))
        }
      }
      if (known.has(key(next))) continue
      known.add(key(next))
      toAdd.push(next)
    }
    await db.expenses.bulkAdd(toAdd as Expense[])
    return toAdd.length
  })
}
