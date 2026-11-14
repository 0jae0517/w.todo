import { shareBase } from './native'
import { supabase } from './supabase'
import { currentUserId } from './sync'
import type { Profile } from './social'
import { cleanItems, type TemplateItem } from './templateItems'

export { cleanItems, type TemplateItem }

export interface Template {
  id: string
  owner_id: string
  title: string
  description: string
  color: string
  items: TemplateItem[]
  listed: boolean
  uses: number
  created_at: string
  owner?: Profile | null
}

const COLS = 'id, owner_id, title, description, color, items, listed, uses, created_at, owner:profiles!templates_owner_id_fkey(id, username, name)'

function db() {
  if (!supabase) throw new Error('동기화 서버가 연결되지 않았어요')
  return supabase
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

const clean = <T extends Template>(t: T): T => ({ ...t, items: cleanItems(t.items) })

export const templateLink = (id: string) => `${shareBase()}?t=${id}`

/** Public templates, most used first; `q` filters by title. */
export async function listTemplates(q = '') {
  let query = db().from('templates').select(COLS).eq('listed', true).order('uses', { ascending: false }).order('created_at', { ascending: false }).limit(50)
  const term = q.trim().replace(/[%_\\,()]/g, '')
  if (term) query = query.ilike('title', `%${term}%`)
  return (check(await query) as unknown as Template[]).map(clean)
}

export async function myTemplates() {
  const me = currentUserId()
  if (!me) return []
  return (check(await db().from('templates').select(COLS).eq('owner_id', me).order('created_at', { ascending: false })) as unknown as Template[]).map(clean)
}

/**
 * One template by its link. "Link only" templates aren't readable from the
 * table, so this goes through get_template(); the owner is looked up after.
 */
export async function getTemplate(id: string) {
  const res = await db().rpc('get_template', { tid: id }).maybeSingle()
  // server without get_template yet (schema.sql not re-run): the old way
  if (res.error?.code === 'PGRST202') {
    const t = check(await db().from('templates').select(COLS).eq('id', id).maybeSingle()) as unknown as Template | null
    return t && clean(t)
  }
  const t = check(res) as Template | null
  if (!t) return null
  let owner: Profile | null = null
  if (currentUserId()) {
    const p = await db().from('profiles').select('id, username, name').eq('id', t.owner_id).maybeSingle()
    owner = (p.data as Profile | null) ?? null
  }
  return clean({ ...t, owner })
}

export async function createTemplate(t: Pick<Template, 'title' | 'description' | 'color' | 'items' | 'listed'>) {
  return (check(await db().from('templates').insert({ ...t, items: cleanItems(t.items) }).select('id').single()) as { id: string }).id
}

export async function setListed(id: string, listed: boolean) {
  check(await db().from('templates').update({ listed }).eq('id', id))
}

export async function deleteTemplate(id: string) {
  check(await db().from('templates').delete().eq('id', id))
}

/** Counts a use; silently skipped when signed out. */
export async function countUse(id: string) {
  if (!supabase || !currentUserId()) return
  await supabase.rpc('use_template', { tid: id })
}

/** Shares the link with the system share sheet, or copies it. Returns what happened. */
export async function shareLink(t: Pick<Template, 'id' | 'title'>) {
  const url = templateLink(t.id)
  if (navigator.share) {
    try {
      await navigator.share({ title: `w.todo 템플릿: ${t.title}`, url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // sharing not allowed here; fall back to copying
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
