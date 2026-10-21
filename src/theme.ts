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

/** Puts the theme on <html data-theme>, which the stylesheet keys off. */
export function applyTheme() {
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
