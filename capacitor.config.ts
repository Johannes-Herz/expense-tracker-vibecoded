import type { CapacitorConfig } from '@capacitor/cli'

// The Android build uses `npm run build:android` (output in dist-android, base "./", no PWA).
// For debug builds the app id gets the suffix ".debug" in android/app/build.gradle, so test data stays separate.
const config: CapacitorConfig = {
  appId: 'de.johannes.expensetracker',
  appName: 'Expense Tracker',
  webDir: 'dist-android',
}

export default config
