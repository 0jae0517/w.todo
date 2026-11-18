import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { isNative } from './native'
import { startTimerLoop } from './pomodoro'
import { startReminders } from './reminders'
import { startSync } from './sync'
// Pretendard for Android and Windows, whose default Korean fonts sit off-center in
// fixed-height boxes; Apple devices keep their system font (it comes first in styles.css)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles.css'
import { applyTheme } from './theme'
import { trackVisualViewport } from './viewport'

applyTheme()
trackVisualViewport()
startSync()
startTimerLoop()
startReminders()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// the app ships its files inside the package, so only the website needs the offline cache
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}
