import { useCallback, useEffect, useState } from 'react'
import { useTimer, type Phase } from './pomodoro'
import { listFollowers, listFollowing, type Profile } from './social'
import { supabase } from './supabase'
import { currentUserId, useSync } from './sync'

/**
 * The pixel office: mutual friends see each other at a desk while a Pomodoro
 * focus session runs, on the sofa during a break, and in the lounge while the
 * app is open. Each person keeps one office_status row up to date.
 */

export type OfficePhase = Phase | 'idle'

export interface OfficeStatus {
  user_id: string
  phase: OfficePhase
  todo_id: string | null
  ends_at: string | null
  seen_at: string
}

export type Spot = 'desk' | 'sofa' | 'lounge' | 'away'

/** Counts as "here" this long after the app was last open. */
const ONLINE_MS = 5 * 60_000
const HEARTBEAT_MS = 2 * 60_000
const HIDDEN_KEY = 'todo-app:office-hidden'

/** Where someone stands in the office right now. A running timer counts even with the app closed. */
export function spotOf(s: OfficeStatus | undefined, now = Date.now()): Spot {
  if (!s) return 'away'
  const running = s.ends_at && Date.parse(s.ends_at) > now
  if (running && s.phase === 'focus') return 'desk'
  if (running && s.phase !== 'idle') return 'sofa'
  return now - Date.parse(s.seen_at) < ONLINE_MS ? 'lounge' : 'away'
}

// ---- showing myself ----

let hidden = (() => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
})()
const hiddenListeners = new Set<(h: boolean) => void>()

export function useOfficeHidden() {
  const [h, setH] = useState(hidden)
  useEffect(() => {
    hiddenListeners.add(setH)
    return () => void hiddenListeners.delete(setH)
  }, [])
  return h
}

export async function setOfficeHidden(h: boolean) {
  hidden = h
  try {
    localStorage.setItem(HIDDEN_KEY, h ? '1' : '0')
  } catch {
    // ignore
  }
  hiddenListeners.forEach((l) => l(h))
  if (h) await leaveOffice()
}

/** Removes my row, so friends stop seeing me (on sign-out or when hidden). */
export async function leaveOffice() {
  const uid = currentUserId()
  if (supabase && uid) await supabase.from('office_status').delete().eq('user_id', uid)
}

/** Keeps my office_status in step with the Pomodoro timer while the app is open. */
export function useOfficePresence() {
  const { session } = useSync()
  const uid = session?.user.id
  const timer = useTimer()
  const isHidden = useOfficeHidden()
  const phase: OfficePhase = timer.endsAt ? timer.phase : 'idle'
  const endsAt = timer.endsAt
  const todoId = timer.endsAt ? timer.todoId : null

  useEffect(() => {
    if (!supabase || !uid || isHidden) return
    const send = () => {
      if (document.visibilityState === 'hidden') return
      supabase!
        .from('office_status')
        .upsert({ user_id: uid, phase, todo_id: todoId, ends_at: endsAt ? new Date(endsAt).toISOString() : null, seen_at: new Date().toISOString() })
        // fails until the profile is made; that's fine
        .then(() => {})
    }
    send()
    const id = setInterval(send, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', send)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', send)
    }
  }, [uid, isHidden, phase, endsAt, todoId])
}

// ---- seeing friends ----

export interface Officemate {
  profile: Profile
  status: OfficeStatus | undefined
  /** title of the todo they're focusing on, when its category is visible to me */
  todoTitle: string | null
}

/** Me plus everyone I follow who follows me back, with their status, kept live. */
export function useOffice(me: Profile | null | undefined) {
  const [people, setPeople] = useState<Profile[] | null>(null)
  const [statuses, setStatuses] = useState<Map<string, OfficeStatus>>(new Map())
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!me) return
    Promise.all([listFollowing(), listFollowers()])
      .then(([following, followers]) => {
        const back = new Set(followers.map((p) => p.id))
        setPeople([me, ...following.filter((p) => back.has(p.id))])
      })
      .catch((e) => setErr(e.message))
  }, [me])

  const ids = people?.map((p) => p.id).join(',') ?? ''

  const load = useCallback(async () => {
    if (!supabase || !ids) return
    const { data, error } = await supabase.from('office_status').select('*').in('user_id', ids.split(','))
    if (error) return setErr(error.message)
    const rows = data as OfficeStatus[]
    setStatuses(new Map(rows.map((r) => [r.user_id, r])))
    // todo titles go through the todos' own visibility rules, so hidden categories stay hidden
    const todoIds = rows.filter((r) => r.todo_id && r.phase === 'focus').map((r) => r.todo_id!)
    if (!todoIds.length) return setTitles(new Map())
    const res = await supabase.from('todos').select('user_id, id, title').in('id', todoIds).in('user_id', ids.split(','))
    const m = new Map<string, string>()
    for (const t of res.data ?? []) if (rows.some((r) => r.user_id === t.user_id && r.todo_id === t.id)) m.set(t.user_id, t.title)
    setTitles(m)
  }, [ids])

  useEffect(() => {
    if (!supabase || !ids) return
    load()
    const ch = supabase
      .channel(`office:${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_status' }, load)
      .subscribe()
    // people drift to "away" without any row changing
    const id = setInterval(load, 60_000)
    return () => {
      clearInterval(id)
      supabase?.removeChannel(ch)
    }
  }, [ids, load])

  const mates: Officemate[] | null = people?.map((p) => ({ profile: p, status: statuses.get(p.id), todoTitle: titles.get(p.id) ?? null })) ?? null
  return { mates, err }
}
