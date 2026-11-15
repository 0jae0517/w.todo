import { useSyncExternalStore } from 'react'

/** Look of the app on this device. */
export type Theme = 'basic' | 'chalk'

const KEY = 'todo-app:theme'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === 'chalk' ? 'chalk' : 'basic'
  } catch {
    return 'basic'
  }
}

let theme = read()

let fontsLoaded = false
/**
 * The chalk theme's handwriting fonts (개구, 감자꽃). Their stylesheets are
 * large (hundreds of Korean unicode-range blocks), so they're only fetched
 * once the chalk theme is in use or offered (the theme picker in 내 정보).
 */
export function loadChalkFonts() {
  if (fontsLoaded) return
  fontsLoaded = true
  void Promise.all([
    import('@fontsource/gaegu/400.css'),
    import('@fontsource/gaegu/700.css'),
    import('@fontsource/gamja-flower/400.css'),
  ])
}

/** Puts the theme on <html data-theme>, which the stylesheet keys off. */
export function applyTheme() {
  if (theme === 'chalk') loadChalkFonts()
  document.documentElement.dataset.theme = theme
  for (const m of document.querySelectorAll('meta[name="theme-color"]'))
    m.setAttribute('content', theme === 'chalk' ? '#2e3440' : m.getAttribute('media')?.includes('dark') ? '#121316' : '#ffffff')
}

export function setTheme(t: Theme) {
  theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // not remembered, that's fine
  }
  applyTheme()
  listeners.forEach((l) => l())
}

export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => theme,
  )
