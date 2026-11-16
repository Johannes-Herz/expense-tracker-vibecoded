// Backups written by every earlier app version must keep importing. One sample file per backup format version
// lives in src/test/fixtures; NEVER edit them to make a test pass: fix the import code instead.
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { buildBackup, importBackup, parseBackup, serializeBackup } from './exportImport'

const load = (v: number) => readFileSync(new URL(`../test/fixtures/backup-v${v}.json`, import.meta.url), 'utf8')

// What each fixture contains: [expenses (incl. income), categories, recurring series]
const EXPECTED: Record<number, [number, number, number]> = { 1: [3, 2, 0], 2: [3, 2, 1], 3: [2, 3, 1], 4: [3, 3, 0] }

beforeEach(() => Promise.all([db.expenses.clear(), db.recurring.clear(), db.categories.clear(), db.settings.clear()]))

describe.each([1, 2, 3, 4])('backup format v%i', (version) => {
  const [entries, categories, series] = EXPECTED[version]

  it('parses and normalizes to the current data model', () => {
    const b = parseBackup(load(version))
    expect(b.expenses).toHaveLength(entries)
    expect(b.categories).toHaveLength(categories)
    expect(b.recurring).toHaveLength(series)
    expect(b.expenses.every((e) => e.type === 'expense' || e.type === 'income')).toBe(true) // old backups: everything is an expense
    expect(b.categories.every((c) => typeof c.trackWeekly === 'boolean')).toBe(true) // flag off when missing
    expect(b.settings.some((s) => s.key === 'monthlyBudgetCents')).toBe(false) // removed setting is dropped
  })

  it('replace: restores everything, and income categories exist afterwards', async () => {
    expect(await importBackup(parseBackup(load(version)), 'replace')).toBe(entries)
    expect(await db.expenses.count()).toBe(entries)
    expect(await db.recurring.count()).toBe(series)
    expect(await db.categories.where('type').equals('income').count()).toBeGreaterThan(0)
    expect(await db.categories.where('type').equals('expense').count()).toBeGreaterThan(0)
  })

  it('merge into existing data adds the entries, and a second merge adds nothing', async () => {
    await db.categories.add({ type: 'expense', name: 'Groceries', emoji: '🛒', color: '#22c55e' } as never)
    expect(await importBackup(parseBackup(load(version)), 'merge')).toBe(entries)
    expect(await importBackup(parseBackup(load(version)), 'merge')).toBe(0)
    expect(await db.expenses.count()).toBe(entries)
    expect(await db.categories.where({ type: 'expense', name: 'Groceries' }).count()).toBe(1) // matched by name, not duplicated
  })
})

describe('specific versions', () => {
  it('v1 keeps its theme setting but drops the old budget', () => {
    const b = parseBackup(load(1))
    expect(b.settings).toEqual([{ key: 'theme', value: 'dark' }])
    expect(b.expenses.every((e) => e.type === 'expense')).toBe(true)
  })

  it('v2 keeps the recurring link of generated entries', async () => {
    await importBackup(parseBackup(load(2)), 'replace')
    expect((await db.expenses.toArray()).filter((e) => e.recurringId !== undefined)).toHaveLength(2)
  })

  it('v3 keeps income, budgets and the hide-from-trends flag', () => {
    const b = parseBackup(load(3))
    expect(b.expenses.find((e) => e.type === 'income')?.amountCents).toBe(240000)
    expect(b.categories.find((c) => c.name === 'Groceries')?.budgetCents).toBe(40000)
    expect(b.categories.find((c) => c.name === 'Savings')?.hideFromTrends).toBe(true)
  })

  it('v4 keeps the weekly tracking flag', () => {
    const b = parseBackup(load(4))
    expect(b.categories.find((c) => c.name === 'Eating out')?.trackWeekly).toBe(true)
  })
})

describe('current format', () => {
  it('a fresh backup of the database parses again and restores identically', async () => {
    await importBackup(parseBackup(load(4)), 'replace')
    const written = serializeBackup(await buildBackup())
    const again = parseBackup(written)
    expect(again.version).toBe(4)
    await importBackup(again, 'replace')
    expect(await db.expenses.count()).toBe(3)
    expect((await db.categories.toArray()).find((c) => c.name === 'Eating out')?.trackWeekly).toBe(true)
  })
})
