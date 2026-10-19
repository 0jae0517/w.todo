import { useSyncExternalStore } from 'react'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearTimer } from './pomodoro'
import { UNTOUCHED, applyRemote, bindUser, getCursor, hasPending, markPushed, onLocalChange, pendingChanges, resetLocal } from './store'
import type { Kind } from './types'

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

interface SyncState {
  status: SyncStatus
  session: Session | null
  error: string | null
}

let state: SyncState = { status: supabase ? 'signed-out' : 'off', session: null, error: null }
const listeners = new Set<() => void>()
function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export const useSync = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )

const KINDS: Kind[] = ['categories', 'todos']
const PAGE = 1000

let running = false
let again = false

export async function syncNow() {
  const userId = state.session?.user.id
  if (!supabase || !userId) return
  if (running) {
    again = true
    return
  }
  if (!navigator.onLine) {
    set({ status: 'offline' })
    return
  }
  running = true
  set({ status: 'syncing' })
  try {
    do {
      again = false
      await push(userId)
      await pull(userId)
    } while (again)
    set({ status: 'synced', error: null })
  } catch (e) {
    set({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) })
  } finally {
    running = false
  }
}

async function push(userId: string) {
  const pending = pendingChanges()
  for (const kind of KINDS) {
    const rows = pending[kind]
    // untouched starter rows only fill in what the account doesn't have yet
    for (const fresh of [false, true]) {
      const batch = rows.filter((r) => (r.updated_at === UNTOUCHED) === fresh)
      if (!batch.length) continue
      const { error } = await supabase!
        .from(kind)
        .upsert(batch.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: fresh })
      if (error) throw new Error(error.message)
      markPushed(kind, batch)
    }
  }
}

async function pull(userId: string) {
  for (const kind of KINDS) {
    for (;;) {
      // followers can read other people's rows too, so always scope to our own
      let q = supabase!.from(kind).select('*').eq('user_id', userId).order('synced_at').limit(PAGE)
      const cursor = getCursor(kind)
      if (cursor) q = q.gt('synced_at', cursor)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      applyRemote(kind, data ?? [])
      if (!data || data.length < PAGE) break
    }
  }
}

let channel: RealtimeChannel | null = null

function listen(userId: string) {
  if (!supabase) return
  channel = supabase.channel(`sync:${userId}`)
  for (const kind of KINDS) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: kind, filter: `user_id=eq.${userId}` }, (p) => {
      // cursors only advance from pulls, so a missed realtime event is picked up later
      if (p.new && 'id' in p.new) applyRemote(kind, [{ ...p.new, synced_at: undefined } as never])
    })
  }
  channel.subscribe()
}

function unlisten() {
  if (channel) supabase?.removeChannel(channel)
  channel = null
}

let timer: ReturnType<typeof setTimeout> | undefined
function scheduleSync() {
  clearTimeout(timer)
  timer = setTimeout(syncNow, 800)
}

export function startSync() {
  if (!supabase) return
  supabase.auth.onAuthStateChange((_event, session) => {
    const prev = state.session?.user.id
    set({ session, status: session ? state.status : 'signed-out' })
    if (session && session.user.id !== prev) {
      bindUser(session.user.id)
      unlisten()
      listen(session.user.id)
      syncNow()
    } else if (!session) {
      unlisten()
    }
  })
  onLocalChange(scheduleSync)
  window.addEventListener('online', () => syncNow())
  window.addEventListener('offline', () => state.session && set({ status: 'offline' }))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow())
}

export async function sendLoginLink(email: string) {
  const { error } = await supabase!.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  })
  if (error) throw new Error(error.message)
}

/**
 * Uploads what's left, signs out and wipes this account's data from the device,
 * so the next person using it can't see it.
 */
export async function signOut() {
  while (running) await new Promise((r) => setTimeout(r, 100))
  await syncNow()
  if (
    hasPending() &&
    !confirm('아직 서버에 올라가지 않은 변경이 있어요. 로그아웃하면 이 기기에서 사라져요. 그래도 로그아웃할까요?')
  )
    return
  // only this device; other devices stay signed in
  await supabase?.auth.signOut({ scope: 'local' })
  resetLocal()
  clearTimer()
}

export const currentUserId = () => state.session?.user.id ?? null

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? '이메일이나 비밀번호가 맞지 않아요' : error.message)
}

/** Returns true when the account still needs its email confirmed before signing in. */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin + location.pathname },
  })
  if (error) throw new Error(error.message)
  return !data.session
}

export async function setPassword(password: string) {
  const { error } = await supabase!.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function signInWithProvider(provider: 'google' | 'kakao') {
  const { error } = await supabase!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: location.origin + location.pathname },
  })
  if (error) throw new Error(error.message)
}
