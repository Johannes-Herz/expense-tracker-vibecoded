import { useLiveQuery } from 'dexie-react-hooks'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { getSetting, setSetting, SETTING_LANGUAGE, SETTING_THEME, SETTING_TREND_THRESHOLD } from '../../db'
import { useTrendThreshold } from '../../hooks/useData'
import { LANGUAGES, setLanguageCache, useT, type Lang } from '../../lib/i18n'
import type { SettingsPage } from '../../lib/route'
import type { Theme } from '../../lib/theme'
import { clampThreshold } from '../../lib/trends'

const segment = (active: boolean) =>
  `h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400'}`

/** The Settings start page: appearance, language, trend threshold and links to the sub-pages. */
export default function SettingsHome({ onOpen }: { onOpen: (page: SettingsPage) => void }) {
  const t = useT()
  const theme = useLiveQuery(() => getSetting<Theme>(SETTING_THEME), []) ?? 'system'
  const lang = useLiveQuery(() => getSetting<Lang>(SETTING_LANGUAGE), []) ?? 'de'
  const trendThreshold = useTrendThreshold()

  const THEMES: { id: Theme; label: string }[] = [
    { id: 'system', label: t.themeSystem },
    { id: 'light', label: t.themeLight },
    { id: 'dark', label: t.themeDark },
  ]
  const rows: { page: SettingsPage; icon: string; label: string }[] = [
    { page: 'categories', icon: '🏷️', label: t.settingsCategories },
    { page: 'data', icon: '💾', label: t.settingsData },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={t.settingsTitle} />

      <Card title={t.appearance}>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {THEMES.map((th) => (
            <button key={th.id} onClick={() => setSetting(SETTING_THEME, th.id)} aria-pressed={theme === th.id} className={segment(theme === th.id)}>
              {th.label}
            </button>
          ))}
        </div>
        <div className="mb-1.5 mt-4 text-sm text-slate-500 dark:text-slate-400">{t.language}</div>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLanguageCache(l.id)
                void setSetting(SETTING_LANGUAGE, l.id)
              }}
              aria-pressed={lang === l.id}
              className={segment(lang === l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t.trendSettingsTitle}>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t.trendThresholdLabel}</span>
          <input
            key={trendThreshold} // re-created after saving so the field shows the clamped value
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            defaultValue={trendThreshold}
            onBlur={(e) => setSetting(SETTING_TREND_THRESHOLD, clampThreshold(Math.round(Number(e.target.value))))}
            className="h-12 w-24 rounded-xl bg-slate-100 px-3 text-center outline-none dark:bg-slate-800"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.trendThresholdHint}</p>
      </Card>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-slate-800 dark:bg-slate-900">
        {rows.map((r) => (
          <li key={r.page}>
            <button
              onClick={() => onOpen(r.page)}
              className="flex min-h-16 w-full items-center gap-3 px-4 text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800"
            >
              <span className="text-2xl">{r.icon}</span>
              <span className="flex-1 font-medium">{r.label}</span>
              <span className="text-xl text-slate-400">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
