// Runs the Gradle wrapper of the Android project (works in PowerShell, cmd and bash): node scripts/gradle.mjs assembleDebug
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const win = process.platform === 'win32'
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (!sdk && !existsSync('android/local.properties')) {
  console.error('Android SDK not found: set ANDROID_HOME (see README, "Android build").')
  process.exit(1)
}
const result = spawnSync(resolve('android', win ? 'gradlew.bat' : 'gradlew'), process.argv.slice(2), { cwd: 'android', stdio: 'inherit', shell: win })
process.exit(result.status ?? 1)
