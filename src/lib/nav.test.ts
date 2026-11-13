import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNav, type WindowLike } from './nav'

/** A tiny fake of window/history: a list of entries, an index, and popstate on back/go. */
function fakeWindow(initialHash = '') {
  const entries: { state: unknown; hash: string }[] = [{ state: null, hash: initialHash }]
  let index = 0
  const listeners: (() => void)[] = []
  const go = (delta: number) => {
    index = Math.max(0, Math.min(entries.length - 1, index + delta))
    listeners.forEach((l) => l())
  }
  const win: WindowLike = {
    history: {
      get state() {
        return entries[index].state
      },
      pushState(state, _title, url) {
        entries.splice(index + 1)
        entries.push({ state, hash: url ?? entries[index].hash })
        index++
      },
      replaceState(state, _title, url) {
        entries[index] = { state, hash: url ?? entries[index].hash }
      },
      back: () => go(-1),
      go,
    },
    location: {
      get hash() {
        return entries[index].hash
      },
    },
    addEventListener: (_type, l) => void listeners.push(l),
  }
  return { win, userBack: () => go(-1), index: () => index, length: () => entries.length }
}

describe('pages', () => {
  it('starts from the hash and normalizes it', () => {
    const f = fakeWindow('')
    const nav = createNav(f.win)
    expect(nav.getRoute()).toEqual({ tab: 'expenses' })
    expect(f.win.location.hash).toBe('#/expenses')
    expect(createNav(fakeWindow('#/settings/data').win).getRoute()).toEqual({ tab: 'settings', sub: 'data' })
  })

  it('switching tabs replaces the history entry (back never walks through tabs)', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    nav.navigate({ tab: 'stats' })
    nav.navigate({ tab: 'planning' })
    expect(f.length()).toBe(1)
    expect(f.win.location.hash).toBe('#/planning')
    expect(nav.getRoute()).toEqual({ tab: 'planning' })
  })

  it('a sub-page adds an entry; the back gesture returns to the list', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const seen = vi.fn()
    nav.subscribe(seen)
    nav.navigate({ tab: 'settings' })
    nav.navigate({ tab: 'settings', sub: 'data' })
    expect(f.length()).toBe(2)
    expect(nav.getRoute()).toEqual({ tab: 'settings', sub: 'data' })
    f.userBack()
    expect(nav.getRoute()).toEqual({ tab: 'settings' })
    expect(seen).toHaveBeenCalled()
  })

  it('the on-screen back arrow uses history when the sub-page was opened in the app', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    nav.navigate({ tab: 'settings' })
    nav.navigate({ tab: 'settings', sub: 'categories' })
    nav.up()
    expect(nav.getRoute()).toEqual({ tab: 'settings' })
    expect(f.index()).toBe(0)
  })

  it('the on-screen back arrow goes to the parent when the sub-page was loaded directly', () => {
    const f = fakeWindow('#/settings/data')
    const nav = createNav(f.win)
    nav.up()
    expect(nav.getRoute()).toEqual({ tab: 'settings' })
    expect(f.length()).toBe(1) // replaced, no extra entry
  })
})

describe('overlays (forms, sheets, dialogs)', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('the back gesture closes the open overlay and stays on the page', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    nav.navigate({ tab: 'stats' })
    const onClose = vi.fn()
    nav.pushOverlay(onClose)
    f.userBack()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(nav.getRoute()).toEqual({ tab: 'stats' })
    expect(f.index()).toBe(0)
  })

  it('nested overlays share one history entry; back closes only the topmost one each time', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const form = vi.fn()
    const confirm = vi.fn()
    nav.pushOverlay(form)
    nav.pushOverlay(confirm)
    expect(f.index()).toBe(1) // one entry for both
    f.userBack()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(form).not.toHaveBeenCalled()
    expect(f.index()).toBe(1) // the form is still open: its entry is back
    f.userBack()
    expect(form).toHaveBeenCalledTimes(1)
    expect(f.index()).toBe(0)
  })

  it('closing via the UI keeps other overlays open and does not call onClose', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const form = vi.fn()
    const confirm = vi.fn()
    nav.pushOverlay(form)
    const t = nav.pushOverlay(confirm)
    nav.releaseOverlay(t) // e.g. "Cancel" in the dialog
    vi.runAllTimers()
    expect(confirm).not.toHaveBeenCalled()
    expect(form).not.toHaveBeenCalled()
    expect(f.index()).toBe(1)
    f.userBack()
    expect(form).toHaveBeenCalledTimes(1)
  })

  it('closing the last overlay via the UI gives the history entry back', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const t = nav.pushOverlay(vi.fn())
    nav.releaseOverlay(t)
    vi.runAllTimers()
    expect(f.index()).toBe(0)
    nav.releaseOverlay(t) // twice is harmless
    vi.runAllTimers()
    expect(f.index()).toBe(0)
  })

  it('closing one overlay and opening another in the same moment keeps working (no race)', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const first = nav.pushOverlay(vi.fn())
    nav.releaseOverlay(first) // e.g. the import dialog is replaced by the replace-confirmation
    const second = vi.fn()
    nav.pushOverlay(second)
    vi.runAllTimers()
    expect(f.index()).toBe(1) // still one entry for the open overlay
    f.userBack()
    expect(second).toHaveBeenCalledTimes(1)
    expect(f.index()).toBe(0)
  })

  it('React StrictMode style (open, close, open again at once) leaves exactly one entry', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    const a = nav.pushOverlay(vi.fn())
    nav.releaseOverlay(a)
    const onClose = vi.fn()
    nav.pushOverlay(onClose)
    vi.runAllTimers()
    expect(f.index()).toBe(1)
    f.userBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('an overlay on a sub-page: back closes it first, then goes up, and only then leaves the app', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    nav.navigate({ tab: 'settings' })
    nav.navigate({ tab: 'settings', sub: 'categories' })
    const editor = vi.fn()
    nav.pushOverlay(editor)
    f.userBack()
    expect(editor).toHaveBeenCalledTimes(1)
    expect(nav.getRoute()).toEqual({ tab: 'settings', sub: 'categories' })
    f.userBack()
    expect(nav.getRoute()).toEqual({ tab: 'settings' })
    expect(f.index()).toBe(0) // next back would leave the app
  })

  it('after an overlay was closed by the UI, back works normally again', () => {
    const f = fakeWindow()
    const nav = createNav(f.win)
    nav.navigate({ tab: 'settings' })
    nav.navigate({ tab: 'settings', sub: 'data' })
    const t = nav.pushOverlay(vi.fn())
    nav.releaseOverlay(t)
    vi.runAllTimers()
    f.userBack()
    expect(nav.getRoute()).toEqual({ tab: 'settings' })
  })
})
