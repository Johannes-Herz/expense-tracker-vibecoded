// Navigation on top of the browser history, so the Android back gesture/button behaves like users expect:
//   - closing the open form / sheet / dialog first (overlays, newest first),
//   - then going from a sub-page up to its tab's home,
//   - and only then leaving the app.
// `createNav` takes a window-like object so it can be unit-tested with a fake history.
//
// Overlays share ONE history entry (a "sentinel") while any of them is open: the back gesture removes
// it and we close the topmost overlay (and add a new sentinel if more overlays are still open).
// When the last overlay is closed by the UI, the sentinel is removed lazily (next tick), so closing one
// dialog and opening another straight away never races with the asynchronous history traversal.
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

/** An open overlay (form, sheet, dialog). */
export interface OverlayToken {
  onClose: () => void
  closed: boolean
}

type EntryState = { nav: 'root' | 'page' | 'overlay' }

export function createNav(win: WindowLike) {
  let route = parseRoute(win.location.hash)
  const listeners = new Set<() => void>()
  const stack: OverlayToken[] = [] // open overlays, oldest first
  let sentinel = false // is our overlay history entry on top of the history?
  let ignorePops = 0 // popstate events caused by our own history.go()

  // Mark the entry we started on (and normalize the hash).
  win.history.replaceState({ nav: 'root' } satisfies EntryState, '', buildHash(route))

  const notify = () => listeners.forEach((l) => l())
  const stateOf = () => win.history.state as EntryState | null

  function ensureSentinel() {
    if (sentinel) return
    win.history.pushState({ nav: 'overlay' } satisfies EntryState, '')
    sentinel = true
  }

  function removeSentinelLater() {
    setTimeout(() => {
      if (sentinel && stack.length === 0) {
        sentinel = false
        ignorePops++
        win.history.go(-1)
      }
    }, 0)
  }

  win.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    if (sentinel) {
      // Back gesture while overlays are open: the sentinel is gone, close only the topmost overlay.
      sentinel = false
      const top = stack.pop()
      if (top) {
        top.closed = true
        top.onClose()
      }
      if (stack.length > 0) ensureSentinel()
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

    /** Open an overlay: from now on the back gesture closes it (calls `onClose`). */
    pushOverlay(onClose: () => void): OverlayToken {
      const token: OverlayToken = { onClose, closed: false }
      stack.push(token)
      ensureSentinel()
      return token
    },

    /** The overlay was closed by the UI (not by back). */
    releaseOverlay(token: OverlayToken) {
      if (token.closed) return
      token.closed = true
      const i = stack.indexOf(token)
      if (i >= 0) stack.splice(i, 1)
      if (stack.length === 0) removeSentinelLater()
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
