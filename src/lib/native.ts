// Things that only exist in the Android app: back button, system bar colors. No-ops in the browser.
import { App } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { isNative } from './platform'

/**
 * Android back button / gesture: our own navigation lives in the browser history (see nav.ts), so going back
 * means history.back(); at the first history entry (the home screen) the app is closed.
 */
export function setupBackButton() {
  if (!isNative) return
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })
}

/** Status/navigation bar icons: light icons on the dark theme, dark icons on the light theme (follows the app theme, not only the system). */
export function setSystemBarStyle(dark: boolean) {
  if (!isNative) return
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}
