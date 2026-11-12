export type Theme = 'system' | 'light' | 'dark'

const media = window.matchMedia('(prefers-color-scheme: dark)')
let current: Theme = 'system'

function update() {
  const dark = current === 'dark' || (current === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

// Follow the system when the setting is "system".
media.addEventListener('change', update)

export function applyTheme(theme: Theme) {
  current = theme
  update()
}
