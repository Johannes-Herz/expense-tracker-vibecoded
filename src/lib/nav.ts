// Navigation on top of the browser history, so the Android back gesture/button behaves like users expect:
//   - closing the open form / sheet / dialog first (overlays, newest first),
//   - then going from a sub-page up to its tab's home,
//   - and only then leaving the app.
// `createNav` takes a window-like object so it can be unit-tested with a fake history.
import { buildHash, parentRoute, parseRoute, sameRoute, type Route } from './route'

interface HistoryLike {
  state: unknown
  pushState(state: unknown, title: string, url?: string): void
  replaceState(state: unknown, title: string, url?: string): void
  back(): void
  go(delta: number): void
}

export interface WindowLike {
  history: HistoryLike
  location: { hash: string }
  addEventListener(type: 'popstate', listener: () => void): void
}

/** An open overlay (form, sheet, dialog). It owns one history entry while it is open. */
export interface OverlayToken {
  id: number
  onClose: () => void
  closed: boolean
}

type EntryState = { nav: 'root' | 'page' } | { nav: 'overlay'; id: number }

export function createNav(win: WindowLike) {
  let route = parseRoute(win.location.hash)
  const listeners = new Set<() => void>()
  const entries: OverlayToken[] = [] // overlay history entries, oldest first (closed ones wait until they can be popped)
  let ignorePops = 0 // popstate events caused by our own history.go()
  let nextId = 1

  // Mark the entry we started on (and normalize the hash).
  win.history.replaceState({ nav: 'root' } satisfies EntryState, '', buildHash(route))

  const notify = () => listeners.forEach((l) => l())
  const stateOf = () => win.history.state as EntryState | null

  /** Pop history entries of overlays that were already closed and sit on top of the history. */
  function settle() {
    let n = 0
    while (entries.length > 0 && entries[entries.length - 1].closed) {
      entries.pop()
      n++
    }
    if (n > 0) {
      ignorePops++
      win.history.go(-n)
    }
  }

  win.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    const top = entries[entries.length - 1]
    if (top) {
      // Back gesture while an overlay is open: close only the topmost one.
      entries.pop()
      top.closed = true
      top.onClose()
      settle()
      return
    }
    const next = parseRoute(win.location.hash)
    if (!sameRoute(next, route)) {
      route = next
      notify()
    }
  })

  /** Switching tabs replaces the history entry; opening a sub-page adds one (so back returns to the list). */
  function navigate(next: Route) {
    if (sameRoute(next, route)) return
    const opensSubPage = next.sub !== undefined && next.tab === route.tab && route.sub === undefined
    const url = buildHash(next)
    if (opensSubPage) win.history.pushState({ nav: 'page' } satisfies EntryState, '', url)
    else win.history.replaceState(stateOf() ?? ({ nav: 'root' } satisfies EntryState), '', url)
    route = next
    notify()
  }

  return {
    getRoute: () => route,

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    navigate,

    /** The on-screen "‹": same as the back gesture when we pushed the page, otherwise go to the parent directly. */
    up() {
      if (route.sub === undefined) return
      if (stateOf()?.nav === 'page') win.history.back()
      else navigate(parentRoute(route))
    },

    /** Open an overlay: adds a history entry so the back gesture closes it. */
    pushOverlay(onClose: () => void): OverlayToken {
      const token: OverlayToken = { id: nextId++, onClose, closed: false }
      entries.push(token)
      win.history.pushState({ nav: 'overlay', id: token.id } satisfies EntryState, '')
      return token
    },

    /** The overlay was closed by the UI (not by back): drop its history entry again. */
    releaseOverlay(token: OverlayToken) {
      if (token.closed) return
      token.closed = true
      settle()
    },
  }
}

export type Nav = ReturnType<typeof createNav>

let instance: Nav | null = null
/** The app-wide navigation (created on first use in the browser). */
export function getNav(): Nav {
  instance ??= createNav(window)
  return instance
}
