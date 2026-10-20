import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { isNative } from './native'
import { startTimerLoop } from './pomodoro'
import { startSync } from './sync'
import './styles.css'

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
