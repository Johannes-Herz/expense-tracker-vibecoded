import { Component, type ErrorInfo, type ReactNode } from 'react'
import { tNow } from '../lib/i18n'

interface State {
  failed: boolean
}

/**
 * Safety net: if rendering ever throws, show a message with a reload button instead of a blank screen.
 * Stored data is not touched by this.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed while rendering', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = tNow()
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">😵</div>
        <h1 className="text-xl font-bold">{t.crashTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.crashInfo}</p>
        <button
          onClick={() => {
            // Go back to the start page and reload; the hash could be what caused the problem.
            window.location.hash = '#/expenses'
            window.location.reload()
          }}
          className="h-12 rounded-xl bg-indigo-600 px-6 font-medium text-white active:bg-indigo-700"
        >
          {t.crashReload}
        </button>
      </div>
    )
  }
}
