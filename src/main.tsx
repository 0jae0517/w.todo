import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}
