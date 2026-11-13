import { useEffect, useRef } from 'react'
import { getNav } from '../lib/nav'

/**
 * Call inside a form / sheet / dialog: while it is mounted, the Android back gesture closes it
 * (via `onClose`) instead of leaving the app. Closing it with a button gives the history entry back
 * (lazily, so React StrictMode's "mount, unmount, mount" in development is harmless).
 */
export function useOverlayBack(onClose: () => void) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const nav = getNav()
    const token = nav.pushOverlay(() => onCloseRef.current())
    return () => nav.releaseOverlay(token)
  }, [])
}
