import { useSyncExternalStore } from 'react';
import { todayKey } from './date';
import { scheduleTimerAlert } from './native';
import { addSession, getState, updateTodo } from './store';
const KEY = 'todo-app:pomodoro';
const FOCUS_DONE = '집중 시간이 끝났어요. 잠깐 쉬어요!';
const BREAK_DONE = '휴식이 끝났어요. 다시 집중해 볼까요?';
const DEFAULTS = { focus: 25, short: 5, long: 15, longEvery: 4 };
export const PHASE_LABEL = { focus: '집중', short: '짧은 휴식', long: '긴 휴식' };
export const phaseLength = (s, p) => s[p] * 60_000;
function load() {
    const base = { phase: 'focus', endsAt: null, remaining: phaseLength(DEFAULTS, 'focus'), round: 0, todoId: null, settings: DEFAULTS, history: {} };
    try {
        const raw = localStorage.getItem(KEY);
        if (raw)
            return { ...base, ...JSON.parse(raw) };
    }
    catch {
        // ignore
    }
    return base;
}
let state = load();
const listeners = new Set();
function set(patch) {
    state = { ...state, ...patch };
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    }
    catch {
        // ignore
    }
    listeners.forEach((l) => l());
    // in the Android app the phase end also gets a system notification, so it arrives with the app closed
    scheduleTimerAlert(state.endsAt, state.phase === 'focus' ? FOCUS_DONE : BREAK_DONE);
}
export const useTimer = () => useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
}, () => state);
export const timeLeft = (s, now = Date.now()) => (s.endsAt ? Math.max(0, s.endsAt - now) : s.remaining);
export function start() {
    if (state.endsAt)
        return;
    if ('Notification' in window && Notification.permission === 'default')
        Notification.requestPermission();
    set({ endsAt: Date.now() + state.remaining });
}
export function pause() {
    if (!state.endsAt)
        return;
    set({ remaining: timeLeft(state), endsAt: null });
}
function goTo(phase, round = state.round) {
    set({ phase, round, endsAt: null, remaining: phaseLength(state.settings, phase) });
}
export const reset = () => goTo(state.phase);
/** Ends the current phase early without counting it. */
export function skip() {
    if (state.phase === 'focus')
        goTo(state.round + 1 >= state.settings.longEvery ? 'long' : 'short', state.round + 1);
    else
        goTo('focus', state.phase === 'long' ? 0 : state.round);
}
export function setTodo(todoId) {
    set({ todoId });
}
/** Starts a fresh focus session for a todo (from the todo's action sheet). */
export function focusOn(todoId) {
    set({ todoId, phase: 'focus', endsAt: null, remaining: phaseLength(state.settings, 'focus') });
    start();
}
export function formatDuration(seconds) {
    const m = Math.round(seconds / 60);
    const h = Math.floor(m / 60);
    return h ? `${h}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`;
}
/** Stops the timer and forgets which todo it was on and the daily counts (used on sign-out). */
export function clearTimer() {
    set({ phase: 'focus', endsAt: null, remaining: phaseLength(state.settings, 'focus'), round: 0, todoId: null, history: {} });
}
export function setSettings(patch) {
    const settings = { ...state.settings, ...patch };
    set({ settings });
    if (!state.endsAt)
        set({ remaining: phaseLength(settings, state.phase) });
}
function finish() {
    const wasFocus = state.phase === 'focus';
    if (wasFocus) {
        const day = todayKey();
        set({ history: { ...state.history, [day]: (state.history[day] ?? 0) + 1 } });
        const todo = state.todoId ? getState().todos.find((t) => t.id === state.todoId) : undefined;
        const seconds = state.settings.focus * 60;
        addSession(new Date(Date.now() - seconds * 1000).toISOString(), seconds, todo?.id ?? null);
        if (todo)
            updateTodo(todo.id, {
                pomodoros: (todo.pomodoros ?? 0) + 1,
                focus_seconds: (todo.focus_seconds ?? 0) + state.settings.focus * 60,
            });
    }
    skip();
    notify(wasFocus ? FOCUS_DONE : BREAK_DONE);
}
function notify(body) {
    beep();
    try {
        if ('Notification' in window && Notification.permission === 'granted')
            new Notification('뽀모도로', { body, icon: '/icon-192.png' });
    }
    catch {
        // some mobile browsers only allow notifications from a service worker
    }
}
function beep() {
    try {
        const ctx = new AudioContext();
        for (let i = 0; i < 3; i++) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.3);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.25);
            o.connect(g).connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.3);
            o.stop(ctx.currentTime + i * 0.3 + 0.25);
        }
    }
    catch {
        // audio not available
    }
}
export function startTimerLoop() {
    setInterval(() => {
        if (state.endsAt && Date.now() >= state.endsAt)
            finish();
    }, 500);
}
