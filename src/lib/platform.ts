import { Capacitor } from '@capacitor/core'

/** True inside the Capacitor (Android) app, false in the browser / PWA. */
export const isNative = Capacitor.isNativePlatform()
