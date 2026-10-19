import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { currentUserId, useSync } from './sync'
import type { Category, Todo } from './types'

export const EMOJIS = ['❤️', '👍', '🎉', '👏', '🔥', '😂', '😢'] as const

export interface Profile {
  id: string
  username: string
  name: string
}

export interface Reaction {
  owner_id: string
  todo_id: string
  user_id: string
  emoji: string
  profile: Profile | null
}

function db() {
  if (!supabase) throw new Error('동기화 서버가 연결되지 않았어요')
  return supabase
}

function me() {
  const id = currentUserId()
  if (!id) throw new Error('로그인이 필요해요')
  return id
}

function check<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data
}

// ---- profiles ----

export async function getProfile(id: string) {
  return check(await db().from('profiles').select('id, username, name').eq('id', id).maybeSingle()) as Profile | null
}

export async function saveProfile(username: string, name: string) {
  const res = await db().from('profiles').upsert({ id: me(), username, name })
  if (res.error?.code === '23505') throw new Error('이미 쓰고 있는 아이디예요')
  if (res.error?.code === '23514') throw new Error('아이디는 영문 소문자, 숫자, _ . 로 3~20자예요')
  check(res)
}

export async function searchProfiles(q: string) {
  const term = q.trim().toLowerCase().replace(/[%_\\]/g, '')
  if (!term) return []
  const rows = check(
    await db().from('profiles').select('id, username, name').or(`username.ilike.${term}%,name.ilike.%${term}%`).neq('id', me()).limit(20),
  )
  return rows as Profile[]
}

// ---- follows ----

export type FollowState = 'following' | 'requested'

/** People I follow or have asked to follow: id -> state */
export async function followingIds() {
  const rows = check(await db().from('follows').select('followee_id, accepted').eq('follower_id', me()))
  return new Map((rows ?? []).map((r) => [r.followee_id as string, (r.accepted ? 'following' : 'requested') as FollowState]))
}

export async function listFollowing() {
  const rows = check(
    await db().from('follows').select('p:profiles!follows_followee_id_fkey(id, username, name)').eq('follower_id', me()).eq('accepted', true),
  )
  return (rows ?? []).map((r) => r.p as unknown as Profile)
}

export async function listFollowers() {
  const rows = check(
    await db().from('follows').select('p:profiles!follows_follower_id_fkey(id, username, name)').eq('followee_id', me()).eq('accepted', true),
  )
  return (rows ?? []).map((r) => r.p as unknown as Profile)
}

/** Follow requests waiting for my answer */
export async function listRequests() {
  const rows = check(
    await db().from('follows').select('p:profiles!follows_follower_id_fkey(id, username, name)').eq('followee_id', me()).eq('accepted', false),
  )
  return (rows ?? []).map((r) => r.p as unknown as Profile)
}

/** Sends a follow request; it counts once the other person accepts. */
export async function follow(id: string) {
  const res = await db().from('follows').insert({ follower_id: me(), followee_id: id })
  if (res.error?.code === '23505') return // already requested
  check(res)
}

/** Unfollows, or cancels a request that hasn't been accepted yet. */
export async function unfollow(id: string) {
  check(await db().from('follows').delete().eq('follower_id', me()).eq('followee_id', id))
}

export async function acceptRequest(id: string) {
  check(await db().from('follows').update({ accepted: true }).eq('follower_id', id).eq('followee_id', me()))
}

/** Declines a request, or removes someone who already follows me. */
export async function removeFollower(id: string) {
  check(await db().from('follows').delete().eq('follower_id', id).eq('followee_id', me()))
}

// ---- a friend's todos ----

export async function friendData(ownerId: string, from: string, to: string) {
  const [cats, todos] = await Promise.all([
    db().from('categories').select('*').eq('user_id', ownerId).order('position'),
    db().from('todos').select('*').eq('user_id', ownerId).gte('date', from).lte('date', to).order('position'),
  ])
  return { categories: check(cats) as Category[], todos: check(todos) as Todo[] }
}

// ---- reactions ----

const REACTION_COLS = 'owner_id, todo_id, user_id, emoji, profile:profiles!reactions_user_id_fkey(id, username, name)'

export async function reactionsFor(ownerId: string, todoIds: string[]) {
  if (!todoIds.length) return []
  const rows = check(await db().from('reactions').select(REACTION_COLS).eq('owner_id', ownerId).in('todo_id', todoIds))
  return rows as unknown as Reaction[]
}

export async function react(ownerId: string, todoId: string, emoji: string) {
  check(await db().from('reactions').upsert({ owner_id: ownerId, todo_id: todoId, user_id: me(), emoji }, { onConflict: 'owner_id,todo_id,user_id' }))
}

export async function unreact(ownerId: string, todoId: string) {
  check(await db().from('reactions').delete().eq('owner_id', ownerId).eq('todo_id', todoId).eq('user_id', me()))
}

/** Groups reactions per todo: todoId -> list */
export function byTodo(list: Reaction[]) {
  const m = new Map<string, Reaction[]>()
  for (const r of list) m.set(r.todo_id, [...(m.get(r.todo_id) ?? []), r])
  return m
}

/** Reactions others left on my todos, kept live via realtime. */
export function useMyReactions(todoIds: string[]) {
  const { session } = useSync()
  const uid = session?.user.id
  const key = todoIds.join(',')
  const [list, setList] = useState<Reaction[]>([])

  const load = useCallback(() => {
    if (!uid || !key) return setList([])
    reactionsFor(uid, key.split(','))
      .then(setList)
      .catch(() => {})
  }, [uid, key])

  useEffect(() => {
    load()
    if (!supabase || !uid) return
    const ch = supabase
      .channel(`reactions:${uid}:${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `owner_id=eq.${uid}` }, load)
      .subscribe()
    return () => {
      supabase?.removeChannel(ch)
    }
  }, [uid, load])

  return byTodo(list)
}

/** Current user's profile; undefined while loading, null when not created yet. */
export function useMyProfile() {
  const { session } = useSync()
  const uid = session?.user.id
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const reload = useCallback(() => {
    if (!uid) return setProfile(undefined)
    getProfile(uid).then(setProfile).catch(() => setProfile(undefined))
  }, [uid])
  useEffect(reload, [reload])
  return { profile, reload }
}
