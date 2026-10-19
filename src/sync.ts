import { useSyncExternalStore } from 'react'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { applyRemote, bindUser, getCursor, markPushed, onLocalChange, pendingChanges } from './store'
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
    if (!rows.length) continue
    const { error } = await supabase!
      .from(kind)
      .upsert(rows.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,id' })
    if (error) throw new Error(error.message)
    markPushed(kind, rows)
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

export async function signOut() {
  await supabase?.auth.signOut()
}

export const currentUserId = () => state.session?.user.id ?? null
