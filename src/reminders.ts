import { useSyncExternalStore } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addDays, timeLabel, todayKey } from './date'
import { isNative } from './native'
import { getState, onLocalChange } from './store'

/**
 * "할 일 시간 알림": a notification at the time set on a todo.
 * In the Android app they're scheduled with the system, so they arrive with
 * the app closed. On the web there's no push server, so they only fire
 * while w.todo is open (in a tab or as an installed app).
 */

const KEY = 'todo-app:reminders'
const SENT_KEY = 'todo-app:reminders-sent'
const AHEAD_DAYS = 7
/** Android allows a limited number of pending alarms per app */
const MAX_SCHEDULED = 50

let on = (() => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()
const listeners = new Set<() => void>()

export const useRemindersOn = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
  )

/** Turns reminders on or off; returns false when notifications aren't allowed. */
export async function setRemindersOn(next: boolean) {
  if (next && !(await askPermission())) return false
  on = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
  void reschedule()
  return true
}

async function askPermission() {
  if (isNative) {
    const p = await LocalNotifications.checkPermissions()
    return p.display === 'granted' || (await LocalNotifications.requestPermissions()).display === 'granted'
  }
  if (!('Notification' in window)) return false
  if (Notification.permission === 'default') await Notification.requestPermission()
  return Notification.permission === 'granted'
}

/** Todos with a time still to come, soonest first. */
function upcoming(now = new Date()) {
  const today = todayKey()
  const end = addDays(today, AHEAD_DAYS)
  return getState()
    .todos.filter((t) => t.time && !t.done && t.date >= today && t.date <= end)
    .map((t) => ({ todo: t, at: new Date(`${t.date}T${t.time}:00`) }))
    .filter((r) => r.at > now)
    .sort((a, b) => +a.at - +b.at)
}

/** A stable notification id per todo (1 is the Pomodoro timer's). */
function idFor(todoId: string) {
  let h = 0
  for (const ch of todoId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return 1000 + (Math.abs(h) % 2_000_000_000)
}

// ---- Android app: hand the next week's reminders to the system ----

let scheduledIds: number[] = []

async function reschedule() {
  if (!isNative) return
  try {
    if (scheduledIds.length) await LocalNotifications.cancel({ notifications: scheduledIds.map((id) => ({ id })) })
    scheduledIds = []
    if (!on) return
    const list = upcoming().slice(0, MAX_SCHEDULED)
    if (!list.length) return
    await LocalNotifications.schedule({
      notifications: list.map(({ todo, at }) => ({
        id: idFor(todo.id),
        title: todo.title,
        body: `${timeLabel(todo.time!)} 할 일이에요`,
        schedule: { at, allowWhileIdle: true },
      })),
    })
    scheduledIds = list.map(({ todo }) => idFor(todo.id))
  } catch {
    // notifications unavailable
  }
}

// ---- web: check every half minute while the app is open ----

function sentSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function checkWeb() {
  if (!on || !('Notification' in window) || Notification.permission !== 'granted') return
  const now = Date.now()
  const today = todayKey()
  const sent = sentSet()
  for (const t of getState().todos) {
    if (!t.time || t.done || t.date !== today) continue
    const at = +new Date(`${t.date}T${t.time}:00`)
    const key = `${t.id}@${t.date}T${t.time}`
    // due now, or within the last 10 minutes (the tab may have been asleep)
    if (at > now || now - at > 10 * 60_000 || sent.has(key)) continue
    sent.add(key)
    const options = { body: `${timeLabel(t.time)} 할 일이에요`, icon: '/icon-192.png', tag: key }
    navigator.serviceWorker
      ?.getRegistration()
      .then((reg) => (reg ? reg.showNotification(t.title, options) : Promise.reject()))
      .catch(() => {
        try {
          new Notification(t.title, options)
        } catch {
          // notifications unavailable
        }
      })
  }
  try {
    // only today's keys are worth keeping
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent].filter((k) => k.includes(`@${today}`))))
  } catch {
    // ignore
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

export function startReminders() {
  if (isNative) {
    // after edits (and remote changes arriving with them), refresh the system's list
    onLocalChange(() => {
      clearTimeout(timer)
      timer = setTimeout(reschedule, 2000)
    })
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && reschedule())
    void reschedule()
  } else {
    setInterval(checkWeb, 30_000)
    checkWeb()
  }
}
