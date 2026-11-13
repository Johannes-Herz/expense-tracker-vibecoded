import { useEffect, useRef } from 'react'
import { getNav, type OverlayToken } from '../lib/nav'

/**
 * Call inside a form / sheet / dialog: while it is mounted, the Android back gesture closes it
 * (via `onClose`) instead of leaving the app. Closing it with a button removes the history entry again.
 *
 * The history entry is added once and released a tick after unmounting, so React StrictMode's
 * "mount, unmount, mount" in development does not add or pop entries twice.
 */
export function useOverlayBack(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  const token = useRef<OverlayToken | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const nav = getNav()
    mounted.current = true
    token.current ??= nav.pushOverlay(() => onCloseRef.current())
    return () => {
      mounted.current = false
      setTimeout(() => {
        if (!mounted.current && token.current) {
          nav.releaseOverlay(token.current)
          token.current = null
        }
      }, 0)
    }
  }, [])
}
