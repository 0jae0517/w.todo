import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useSync } from './sync'
import type { Profile } from './social'
import type { Template } from './templates'

function db() {
  if (!supabase) throw new Error('동기화 서버가 연결되지 않았어요')
  return supabase
}

function check<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data
}

/** true only for accounts in the admins table; the server checks again on every admin call. */
export function useIsAdmin() {
  const { session } = useSync()
  const uid = session?.user.id
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    setAdmin(false)
    if (!uid || !supabase) return
    let alive = true
    supabase.rpc('is_admin').then(({ data }) => alive && setAdmin(data === true))
    return () => {
      alive = false
    }
  }, [uid])
  return admin
}

// ---- 현황 ----

export interface AdminStats {
  users: number
  new_today: number
  new_7d: number
  new_30d: number
  active_1d: number
  active_7d: number
  active_30d: number
  profiles: number
  todos: number
  todos_done: number
  focus_hours: number
  templates: number
  open_reports: number
  signups: { day: string; count: number }[]
}

export async function adminStats() {
  return check(await db().rpc('admin_stats')) as AdminStats
}

// ---- 사용자 ----

export interface AdminUser {
  id: string
  email: string | null
  username: string | null
  name: string | null
  provider: string
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
  todos: number
  admin: boolean
  /** the account email is empty, so this is the email Kakao sent */
  email_unverified: boolean
}

export async function adminUsers(q = '', skip = 0) {
  return check(await db().rpc('admin_users', { q: q.trim(), lim: 50, skip })) as AdminUser[]
}

/** days: null lifts the ban, 0 bans for good. */
export async function setBan(id: string, days: number | null) {
  check(await db().rpc('admin_set_ban', { target: id, days }))
}

export async function deleteUser(id: string) {
  check(await db().rpc('admin_delete_user', { target: id }))
}

export const isBanned = (u: Pick<AdminUser, 'banned_until'>) => !!u.banned_until && new Date(u.banned_until) > new Date()

// ---- 템플릿 ----

const TPL_COLS = 'id, owner_id, title, description, color, items, listed, uses, created_at, owner:profiles!templates_owner_id_fkey(id, username, name)'

/** Every template, newest first, listed or not. */
export async function allTemplates(q = '') {
  let query = db().from('templates').select(TPL_COLS).order('created_at', { ascending: false }).limit(100)
  const term = q.trim().replace(/[%_\\,()]/g, '')
  if (term) query = query.ilike('title', `%${term}%`)
  return check(await query) as unknown as Template[]
}

// ---- 신고 ----

export const REPORT_REASONS = {
  spam: '스팸·광고',
  abuse: '욕설·괴롭힘',
  sexual: '음란물',
  privacy: '개인정보 노출',
  other: '기타',
} as const
export type ReportReason = keyof typeof REPORT_REASONS
export type ReportTarget = 'template' | 'profile'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface Report {
  id: string
  reporter_id: string | null
  target_type: ReportTarget
  target_id: string
  reason: ReportReason
  detail: string
  status: ReportStatus
  created_at: string
  handled_at: string | null
  reporter?: Profile | null
  /** filled in by listReports: what was reported, or null when it's gone */
  target?: { title: string; sub: string } | null
}

export async function sendReport(target_type: ReportTarget, target_id: string, reason: ReportReason, detail: string) {
  const res = await db().from('reports').insert({ target_type, target_id, reason, detail: detail.trim().slice(0, 500) })
  if (res.error?.code === '23505') throw new Error('이미 신고했어요. 관리자가 확인하고 있어요.')
  check(res)
}

export async function listReports(status: ReportStatus) {
  const rows = check(
    await db().from('reports').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100),
  ) as Report[]
  const ids = (t: ReportTarget) => [...new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id))]
  const people = [...new Set([...ids('profile'), ...rows.map((r) => r.reporter_id).filter((x): x is string => !!x)])]
  const [tpls, profs] = await Promise.all([
    ids('template').length ? db().from('templates').select('id, title, owner:profiles!templates_owner_id_fkey(username)').in('id', ids('template')) : null,
    people.length ? db().from('profiles').select('id, username, name').in('id', people) : null,
  ])
  const tplMap = new Map(((tpls?.data ?? []) as unknown as { id: string; title: string; owner: { username: string } | null }[]).map((t) => [t.id, t]))
  const profMap = new Map(((profs?.data ?? []) as Profile[]).map((p) => [p.id, p]))
  for (const r of rows) {
    r.reporter = r.reporter_id ? profMap.get(r.reporter_id) ?? null : null
    if (r.target_type === 'template') {
      const t = tplMap.get(r.target_id)
      r.target = t ? { title: t.title, sub: t.owner ? `@${t.owner.username}` : '' } : null
    } else {
      const p = profMap.get(r.target_id)
      r.target = p ? { title: p.name || p.username, sub: `@${p.username}` } : null
    }
  }
  return rows
}

export async function setReportStatus(id: string, status: ReportStatus) {
  check(await db().from('reports').update({ status, handled_at: status === 'open' ? null : new Date().toISOString() }).eq('id', id))
}

// ---- 공지 ----

export interface Announcement {
  id: string
  title: string
  body: string
  active: boolean
  created_at: string
}

/** Everything, for the admin screen (others only ever see active ones). */
export async function allAnnouncements() {
  return check(await db().from('announcements').select('*').order('created_at', { ascending: false }).limit(50)) as Announcement[]
}

export async function saveAnnouncement(a: Pick<Announcement, 'title' | 'body' | 'active'> & { id?: string }) {
  if (a.id) check(await db().from('announcements').update({ title: a.title, body: a.body, active: a.active }).eq('id', a.id))
  else check(await db().from('announcements').insert({ title: a.title, body: a.body, active: a.active }))
}

export async function deleteAnnouncement(id: string) {
  check(await db().from('announcements').delete().eq('id', id))
}

const SEEN_KEY = 'todo-app:notice-closed'

function closedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** The newest active announcement this device hasn't closed yet. */
export function useAnnouncement() {
  const [notice, setNotice] = useState<Announcement | null>(null)
  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!alive || !data) return
        const closed = closedIds()
        setNotice((data as Announcement[]).find((a) => !closed.includes(a.id)) ?? null)
      })
    return () => {
      alive = false
    }
  }, [])
  const close = () => {
    if (!notice) return
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...closedIds(), notice.id].slice(-30)))
    } catch {
      // shows again next time, that's fine
    }
    setNotice(null)
  }
  return { notice, close }
}
