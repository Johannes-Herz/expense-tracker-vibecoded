import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db } from '../db'
import { importBackup, parseBackup } from '../lib/exportImport'
import { useT } from '../lib/i18n'
import { isNative } from '../lib/platform'
import Toast from './Toast'

const KEY = 'welcomeDismissed'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** First start of the Android app (no entries yet): makes restoring a backup the obvious first step. */
export default function WelcomeCard() {
  const t = useT()
  const count = useLiveQuery(() => db.expenses.count(), [])
  const [dismissed, setDismissed] = useState(read)
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // not remembered: the card just reappears next time
    }
    setDismissed(true)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      // The app is empty, so loading the backup replaces nothing the user has entered.
      await importBackup(parseBackup(await file.text()), 'replace') // the restored entries replace this card
      dismiss()
    } catch (err) {
      setMessage((err as Error).message)
    }
    if (input.current) input.current.value = ''
  }

  if (!isNative || count !== 0 || dismissed) return null

  return (
    <section className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
      <h2 className="font-semibold">{t.welcomeTitle}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.welcomeText}</p>
      <div className="mt-3 space-y-2">
        <button onClick={() => input.current?.click()} className="h-12 w-full rounded-xl bg-indigo-600 font-medium text-white active:bg-indigo-700">
          {t.welcomeRestore}
        </button>
        <button onClick={dismiss} className="h-11 w-full rounded-xl text-sm font-medium text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800">
          {t.welcomeStart}
        </button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {message && <Toast message={message} onClose={() => setMessage('')} />}
    </section>
  )
}
