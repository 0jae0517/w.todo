import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { authRedirect, isNative, nativeOAuth } from './native';
import { clearTimer } from './pomodoro';
import { leaveOffice } from './office';
import { UNTOUCHED, applyRemote, bindUser, generateRepeats, getCursor, hasPending, markPushed, onLocalChange, pendingChanges, resetLocal } from './store';
let state = { status: supabase ? 'signed-out' : 'off', session: null, error: null };
const listeners = new Set();
function set(patch) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
}
export const useSync = () => useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
}, () => state);
const KINDS = ['categories', 'routines', 'todos', 'sessions', 'courses'];
/** A table the server doesn't have yet (schema.sql not re-run): skip it instead of failing the whole sync. */
const missingTable = (e) => e.code === 'PGRST205' || e.code === '42P01';
const PAGE = 1000;
let running = false;
let again = false;
export async function syncNow() {
    const userId = state.session?.user.id;
    if (!supabase || !userId)
        return;
    if (running) {
        again = true;
        return;
    }
    if (!navigator.onLine) {
        set({ status: 'offline' });
        return;
    }
    running = true;
    set({ status: 'syncing' });
    try {
        do {
            again = false;
            await push(userId);
            await pull(userId);
        } while (again);
        set({ status: 'synced', error: null });
        // only after a pull, so routines stopped on another device don't come back
        generateRepeats();
    }
    catch (e) {
        set({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) });
    }
    finally {
        running = false;
    }
}
async function push(userId) {
    const pending = pendingChanges();
    for (const kind of KINDS) {
        const rows = pending[kind];
        // untouched starter rows only fill in what the account doesn't have yet
        for (const fresh of [false, true]) {
            const batch = rows.filter((r) => (r.updated_at === UNTOUCHED) === fresh);
            if (!batch.length)
                continue;
            const { error } = await supabase
                .from(kind)
                .upsert(batch.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: fresh });
            if (error && missingTable(error))
                break;
            if (error)
                throw new Error(error.message);
            markPushed(kind, batch);
        }
    }
}
async function pull(userId) {
    for (const kind of KINDS) {
        for (;;) {
            // followers can read other people's rows too, so always scope to our own
            let q = supabase.from(kind).select('*').eq('user_id', userId).order('synced_at').limit(PAGE);
            const cursor = getCursor(kind);
            if (cursor)
                q = q.gt('synced_at', cursor);
            const { data, error } = await q;
            if (error && missingTable(error))
                break;
            if (error)
                throw new Error(error.message);
            applyRemote(kind, data ?? []);
            if (!data || data.length < PAGE)
                break;
        }
    }
}
let channel = null;
function listen(userId) {
    if (!supabase)
        return;
    channel = supabase.channel(`sync:${userId}`);
    for (const kind of KINDS) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: kind, filter: `user_id=eq.${userId}` }, (p) => {
            // cursors only advance from pulls, so a missed realtime event is picked up later
            if (p.new && 'id' in p.new)
                applyRemote(kind, [{ ...p.new, synced_at: undefined }]);
        });
    }
    channel.subscribe();
}
function unlisten() {
    if (channel)
        supabase?.removeChannel(channel);
    channel = null;
}
let timer;
function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(syncNow, 800);
}
export function startSync() {
    if (!supabase)
        return generateRepeats();
    supabase.auth.onAuthStateChange((_event, session) => {
        const prev = state.session?.user.id;
        set({ session, status: session ? state.status : 'signed-out' });
        if (session && session.user.id !== prev) {
            bindUser(session.user.id);
            unlisten();
            listen(session.user.id);
            syncNow();
        }
        else if (!session) {
            unlisten();
            generateRepeats();
        }
    });
    onLocalChange(scheduleSync);
    window.addEventListener('online', () => syncNow());
    window.addEventListener('offline', () => state.session && set({ status: 'offline' }));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible')
            return;
        if (state.session)
            syncNow();
        else
            generateRepeats();
    });
}
export async function sendLoginLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authRedirect() },
    });
    if (error)
        throw new Error(error.message);
}
/**
 * Uploads what's left, signs out and wipes this account's data from the device,
 * so the next person using it can't see it.
 */
export async function signOut() {
    while (running)
        await new Promise((r) => setTimeout(r, 100));
    await syncNow();
    if (hasPending() &&
        !confirm('아직 서버에 올라가지 않은 변경이 있어요. 로그아웃하면 이 기기에서 사라져요. 그래도 로그아웃할까요?'))
        return;
    // friends stop seeing me in the office right away
    await leaveOffice().catch(() => { });
    // only this device; other devices stay signed in
    await supabase?.auth.signOut({ scope: 'local' });
    resetLocal();
    clearTimer();
}
/**
 * Deletes the account on the server (every row goes with it) and wipes this
 * device. Other devices are signed out once their session can't refresh.
 */
export async function deleteAccount() {
    while (running)
        await new Promise((r) => setTimeout(r, 100));
    const { error } = await supabase.rpc('delete_account');
    if (error)
        throw new Error(error.message);
    await supabase.auth.signOut({ scope: 'local' });
    resetLocal();
    clearTimer();
}
export const currentUserId = () => state.session?.user.id ?? null;
export async function signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw new Error(error.message === 'Invalid login credentials' ? '이메일이나 비밀번호가 맞지 않아요' : error.message);
}
/** Returns true when the account still needs its email confirmed before signing in. */
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect() },
    });
    if (error)
        throw new Error(error.message);
    return !data.session;
}
export async function setPassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
        throw new Error(error.message);
}
export async function signInWithProvider(provider) {
    if (isNative)
        return nativeOAuth(provider);
    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirect() },
    });
    if (error)
        throw new Error(error.message);
}
