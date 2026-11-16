import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './platform'

/**
 * Hands a generated file to the user: a normal download in the browser, the Android share sheet in the app
 * (save to Files / Drive, send by mail, ...) because there is no browser download there.
 */
export async function saveFile(filename: string, content: string, mime: string) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
    try {
      await Share.share({ title: filename, files: [uri] })
    } catch {
      // The user closed the share sheet: nothing to do.
    }
    return
  }
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
