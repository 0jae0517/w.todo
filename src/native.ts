import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { supabase } from './supabase'

/** True inside the Android (Capacitor) app, false on the web. */
export const isNative = Capacitor.isNativePlatform()

/** The web address, used for links people open elsewhere (the app itself runs at https://localhost). */
export const PUBLIC_URL = 'https://w-todo-seven.vercel.app/'

/** Where Supabase sends the app back after a social or email login. Must be in Supabase's Redirect URLs. */
const AUTH_CALLBACK = 'com.wtodo.app://auth'

/** Redirect target for login flows: the page itself on the web, the app's own link scheme in the app. */
export const authRedirect = () => (isNative ? AUTH_CALLBACK : location.origin + location.pathname)

/** Base for links shared with other people. */
export const shareBase = () => (isNative ? PUBLIC_URL : location.origin + location.pathname)

/**
 * Google refuses logins inside an app's embedded web view, so in the app the
 * provider page opens in the system browser (Custom Tabs) and comes back
 * through AUTH_CALLBACK, handled in startNative().
 */
export async function nativeOAuth(provider: 'google' | 'kakao') {
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true },
  })
  if (error) throw new Error(error.message)
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
}

async function finishLogin(url: string) {
  // implicit flow: tokens come back in the fragment (errors may come in the query)
  const u = new URL(url)
  const params = new URLSearchParams(u.hash.slice(1) || u.search.slice(1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  Browser.close().catch(() => {})
  if (access_token && refresh_token) await supabase?.auth.setSession({ access_token, refresh_token })
}

/** Wires up app-only behaviour: login callbacks, the Android back button. */
export function startNative(onTemplateLink: (id: string) => void) {
  if (!isNative) return
  App.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith(AUTH_CALLBACK)) return void finishLogin(url)
    const t = new URL(url).searchParams.get('t')
    if (t) onTemplateLink(t)
  })
  // back closes an open sheet first (sheets close on Escape), then leaves the app
  App.addListener('backButton', () => {
    if (document.querySelector('.backdrop')) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    else App.minimizeApp()
  })
}

// ---- Pomodoro alert while the app is in the background ----

const TIMER_ID = 1
let scheduledFor: number | null = null

/** Keeps one system notification scheduled for the end of the running phase. */
export async function scheduleTimerAlert(endsAt: number | null, body: string) {
  if (!isNative || endsAt === scheduledFor) return
  scheduledFor = endsAt
  try {
    await LocalNotifications.cancel({ notifications: [{ id: TIMER_ID }] })
    if (!endsAt) return
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') {
      if ((await LocalNotifications.requestPermissions()).display !== 'granted') return
    }
    await LocalNotifications.schedule({
      notifications: [{ id: TIMER_ID, title: '뽀모도로', body, schedule: { at: new Date(endsAt), allowWhileIdle: true } }],
    })
  } catch {
    // notifications unavailable; the in-app beep still plays when the app is open
  }
}
