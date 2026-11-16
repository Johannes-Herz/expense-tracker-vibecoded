import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backupFileName, createAutoBackup, DEBOUNCE_MS, MAX_BACKUPS } from './autoBackup'
import type { Backup } from './exportImport'

function setup(opts: { failWrite?: boolean; undeletable?: string[] } = {}) {
  let data: Backup = { app: 'ExpenseTracker', version: 4, exportedAt: '', categories: [], expenses: [], recurring: [], settings: [] }
  const files: string[] = []
  const memory = new Map<string, string>()
  const written: string[] = []
  let clock = new Date(2026, 10, 16, 22, 48)
  const engine = createAutoBackup({
    build: async () => ({ ...data, exportedAt: clock.toISOString() }), // timestamp changes every call
    write: async (name) => {
      if (opts.failWrite) throw new Error('disk full')
      if (!files.includes(name)) files.push(name)
      written.push(name)
    },
    list: async () => [...files].sort().reverse().map((name) => ({ name })),
    remove: async (name) => {
      if (opts.undeletable?.includes(name)) return false
      files.splice(files.indexOf(name), 1)
      return true
    },
    store: { get: (k) => memory.get(k) ?? null, set: (k, v) => (v === null ? memory.delete(k) : memory.set(k, v)) },
    now: () => clock,
  })
  return {
    engine,
    files,
    written,
    change: () => (data = { ...data, settings: [...data.settings, { key: `k${data.settings.length}`, value: 1 }] }),
    advance: (minutes: number) => (clock = new Date(clock.getTime() + minutes * 60_000)),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('auto backup', () => {
  it('names files with a local timestamp', () => {
    expect(backupFileName(new Date(2026, 10, 16, 22, 48))).toBe('expense-tracker-backup-2026-11-16_22-48.json')
  })

  it('debounces: many changes produce one file, a few seconds after the last change', async () => {
    const s = setup()
    s.change()
    s.engine.schedule()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1000)
    s.change()
    s.engine.schedule() // restarts the quiet period
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
    expect(s.written).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2)
    await vi.waitFor(() => expect(s.written).toHaveLength(1)) // hashing is real async work
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2)
    expect(s.written).toHaveLength(1)
  })

  it('writes nothing when the data did not change (the timestamp alone is not a change)', async () => {
    const s = setup()
    s.change()
    expect(await s.engine.flush()).toBe(true)
    s.advance(5)
    expect(await s.engine.flush()).toBe(false)
    expect(s.written).toHaveLength(1)
    s.change()
    s.advance(1)
    expect(await s.engine.flush()).toBe(true)
    expect(s.written).toHaveLength(2)
  })

  it('keeps only the newest 3 backups', async () => {
    const s = setup()
    for (let i = 0; i < 5; i++) {
      s.change()
      s.advance(1)
      await s.engine.flush()
    }
    expect(s.files).toHaveLength(MAX_BACKUPS)
    expect([...s.files].sort().pop()).toContain('22-53') // newest kept
    expect(s.files).not.toContain(backupFileName(new Date(2026, 10, 16, 22, 49)))
  })

  it('a file that cannot be deleted does not break the backup', async () => {
    const s = setup({ undeletable: [backupFileName(new Date(2026, 10, 16, 22, 49))] })
    for (let i = 0; i < 5; i++) {
      s.change()
      s.advance(1)
      expect(await s.engine.flush()).toBe(true)
    }
    expect(s.engine.getState().error).toBeNull()
  })

  it('records an error when writing fails and retries on the next change', async () => {
    const s = setup({ failWrite: true })
    s.change()
    expect(await s.engine.flush()).toBe(false)
    expect(s.engine.getState().error).toBe('disk full')
    expect(s.engine.getState().lastSuccess).toBeNull()
  })

  it('remembers the last success and clears the error afterwards', async () => {
    const s = setup()
    s.change()
    await s.engine.flush()
    expect(s.engine.getState().lastSuccess).toBe(new Date(2026, 10, 16, 22, 48).toISOString())
    expect(s.engine.getState().error).toBeNull()
  })
})
