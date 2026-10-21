import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { isNative } from './native'
import { startTimerLoop } from './pomodoro'
import { startSync } from './sync'
import '@fontsource/gaegu/400.css'
import '@fontsource/gaegu/700.css'
import '@fontsource/gamja-flower/400.css'
import './styles.css'
import { applyTheme } from './theme'

applyTheme()
startSync()
startTimerLoop()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// the app ships its files inside the package, so only the website needs the offline cache
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}
