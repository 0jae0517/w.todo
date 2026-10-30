import { shareBase } from './native';
import { supabase } from './supabase';
import { currentUserId } from './sync';
const COLS = 'id, owner_id, title, description, color, items, listed, uses, created_at, owner:profiles!templates_owner_id_fkey(id, username, name)';
function db() {
    if (!supabase)
        throw new Error('동기화 서버가 연결되지 않았어요');
    return supabase;
}
function check({ data, error }) {
    if (error)
        throw new Error(error.message);
    return data;
}
export const templateLink = (id) => `${shareBase()}?t=${id}`;
/** Public templates, most used first; `q` filters by title. */
export async function listTemplates(q = '') {
    let query = db().from('templates').select(COLS).eq('listed', true).order('uses', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    const term = q.trim().replace(/[%_\\,()]/g, '');
    if (term)
        query = query.ilike('title', `%${term}%`);
    return check(await query);
}
export async function myTemplates() {
    const me = currentUserId();
    if (!me)
        return [];
    return check(await db().from('templates').select(COLS).eq('owner_id', me).order('created_at', { ascending: false }));
}
export async function getTemplate(id) {
    return check(await db().from('templates').select(COLS).eq('id', id).maybeSingle());
}
export async function createTemplate(t) {
    return check(await db().from('templates').insert(t).select('id').single()).id;
}
export async function setListed(id, listed) {
    check(await db().from('templates').update({ listed }).eq('id', id));
}
export async function deleteTemplate(id) {
    check(await db().from('templates').delete().eq('id', id));
}
/** Counts a use; silently skipped when signed out. */
export async function countUse(id) {
    if (!supabase || !currentUserId())
        return;
    await supabase.rpc('use_template', { tid: id });
}
/** Shares the link with the system share sheet, or copies it. Returns what happened. */
export async function shareLink(t) {
    const url = templateLink(t.id);
    if (navigator.share) {
        try {
            await navigator.share({ title: `w.todo 템플릿: ${t.title}`, url });
            return 'shared';
        }
        catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError')
                return 'cancelled';
            // sharing not allowed here; fall back to copying
        }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
}
