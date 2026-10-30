import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { WEEKDAYS, addDays, fromKey, todayKey, weekOf } from '../date';
import { formatDuration } from '../pomodoro';
import { listFollowers, listFollowing, useMyProfile } from '../social';
import { useStore } from '../store';
import { supabase } from '../supabase';
import { deleteAccount, signOut, syncNow, useSync } from '../sync';
import { PRIVACY_URL } from '../native';
import { DeleteAccount, LoginPanel, PasswordForm, STATUS_LABEL } from './Account';
import FocusPattern from './FocusPattern';
import { ProfileForm } from './Friends';
import Heatmap from './Heatmap';
import Recap, { lastMonthLabel, recapReady } from './Recap';
import Sheet from './Sheet';
import Mascot from './Mascot';
import { setTheme, useTheme } from '../theme';
import { setTimetableOn, useTimetableOn } from '../timetable';
import { ChevronRightIcon, PersonIcon, SparkleIcon, TomatoIcon } from './Icons';
const VIEWS = [
    ['summary', '요약'],
    ['grass', '잔디'],
    ['focus', '집중'],
    ['recap', '회고'],
];
const VIEW_KEY = 'todo-app:me-view';
export default function Me({ todos, categories }) {
    const { sessions } = useStore();
    const [view, setView] = useState(() => {
        try {
            return localStorage.getItem(VIEW_KEY) || 'summary';
        }
        catch {
            return 'summary';
        }
    });
    const pick = (v) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        }
        catch {
            // not remembered, that's fine
        }
    };
    const ready = recapReady(todos, categories);
    return (_jsxs("div", { className: "me", children: [_jsx(AccountRow, {}), ready && view !== 'recap' && (_jsxs("button", { className: "recap-open fresh", onClick: () => pick('recap'), children: [_jsxs("span", { children: [_jsx(SparkleIcon, {}), " ", lastMonthLabel(), " \uD68C\uACE0\uAC00 \uC900\uBE44\uB410\uC5B4\uC694"] }), _jsx(ChevronRightIcon, {})] })), _jsx(ThemePicker, {}), _jsx(TimetableToggle, {}), _jsx("div", { className: "seg", role: "tablist", children: VIEWS.map(([v, label]) => (_jsx("button", { role: "tab", "aria-selected": view === v, className: view === v ? 'on' : '', onClick: () => pick(v), children: label }, v))) }), _jsxs("section", { className: "card", children: [view === 'summary' && _jsx(Summary, { todos: todos, categories: categories }), view === 'grass' && (_jsxs(_Fragment, { children: [_jsx(Heatmap, { todos: todos, categories: categories }), _jsx(PerCategory, { todos: todos, categories: categories })] })), view === 'focus' && (_jsxs(_Fragment, { children: [_jsx(FocusPattern, { sessions: sessions }), _jsx(TopFocus, { todos: todos })] })), view === 'recap' && _jsx(Recap, { todos: todos, categories: categories })] })] }));
}
/** One line at the top: who I am (or a way to sign in), with settings behind a tap. */
function AccountRow() {
    const { session, status } = useSync();
    const { profile, reload } = useMyProfile();
    const [open, setOpen] = useState(false);
    const [counts, setCounts] = useState(null);
    useEffect(() => {
        if (!profile)
            return;
        Promise.all([listFollowers(), listFollowing()])
            .then(([a, b]) => setCounts({ followers: a.length, following: b.length }))
            .catch(() => { });
    }, [profile]);
    if (!supabase)
        return _jsx("p", { className: "sheet-sub", children: "\uB3D9\uAE30\uD654 \uC11C\uBC84\uAC00 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544 \uC774 \uAE30\uAE30\uC5D0\uB9CC \uC800\uC7A5\uD558\uACE0 \uC788\uC5B4\uC694." });
    const name = profile ? profile.name || profile.username : session ? '프로필 만들기' : '로그인';
    return (_jsxs(_Fragment, { children: [_jsxs("button", { className: "account-row", onClick: () => setOpen(true), children: [_jsx("span", { className: "avatar big", children: profile ? name.slice(0, 1).toUpperCase() : _jsx(PersonIcon, {}) }), _jsxs("span", { className: "profile-text", children: [_jsx("strong", { children: name }), profile ? (_jsxs("span", { className: "profile-counts", children: ["@", profile.username, counts && (_jsxs(_Fragment, { children: [' · ', "\uD314\uB85C\uC6CC ", _jsx("b", { children: counts.followers }), " \u00B7 \uD314\uB85C\uC789 ", _jsx("b", { children: counts.following })] }))] })) : (_jsx("span", { className: "profile-counts", children: session ? '친구가 아이디로 나를 찾을 수 있어요' : '로그인하면 휴대폰과 컴퓨터가 동기화돼요' }))] }), session && _jsx("span", { className: `dot s-${status}`, title: STATUS_LABEL[status] }), _jsx("span", { className: "muted chevron", children: _jsx(ChevronRightIcon, {}) })] }), open && (_jsx(Sheet, { onClose: () => setOpen(false), children: !session ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "sheet-title", children: "\uB85C\uADF8\uC778" }), _jsx(LoginPanel, {})] })) : (_jsx(Settings, { onSaved: () => {
                        reload();
                        setOpen(false);
                    } })) }))] }));
}
function Settings({ onSaved }) {
    const { status, session, error } = useSync();
    const { profile } = useMyProfile();
    return (_jsxs("div", { className: "settings", children: [profile !== undefined && _jsx(ProfileForm, { initial: profile ?? undefined, onSaved: onSaved }), _jsx("h3", { className: "sub-title", children: "\uACC4\uC815" }), _jsx("p", { className: "sheet-sub", children: session?.user.email ?? '이메일 없음' }), _jsx("p", { className: `status-line s-${status}`, children: STATUS_LABEL[status] }), error && status === 'error' && _jsx("p", { className: "error", children: error }), _jsxs("div", { className: "actions", children: [_jsx("button", { onClick: () => syncNow(), children: "\uC9C0\uAE08 \uB3D9\uAE30\uD654" }), _jsx("button", { onClick: () => signOut(), children: "\uB85C\uADF8\uC544\uC6C3" })] }), _jsx(PasswordForm, {}), _jsx(DeleteAccount, { onDelete: deleteAccount }), _jsx("a", { className: "link privacy-link", href: PRIVACY_URL, target: "_blank", rel: "noopener", children: "\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68" })] }));
}
function Summary({ todos, categories }) {
    const today = todayKey();
    const r = useMemo(() => {
        const byDay = new Map();
        for (const t of todos) {
            const d = byDay.get(t.date) ?? { total: 0, done: 0, focus: 0 };
            d.total++;
            if (t.done)
                d.done++;
            d.focus += t.focus_seconds;
            byDay.set(t.date, d);
        }
        const doneTotal = todos.filter((t) => t.done).length;
        const focusTotal = todos.reduce((s, t) => s + t.focus_seconds, 0);
        const week = weekOf(today).map((k) => byDay.get(k) ?? { total: 0, done: 0, focus: 0 });
        const weekTotal = week.reduce((s, d) => s + d.total, 0);
        const weekDone = week.reduce((s, d) => s + d.done, 0);
        // consecutive days with at least one finished todo, counting back from today
        // (today not finished yet doesn't break the streak)
        let streak = 0;
        let day = (byDay.get(today)?.done ?? 0) > 0 ? today : addDays(today, -1);
        while ((byDay.get(day)?.done ?? 0) > 0) {
            streak++;
            day = addDays(day, -1);
        }
        const recent = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((k) => ({ key: k, ...(byDay.get(k) ?? { total: 0, done: 0, focus: 0 }) }));
        return { doneTotal, focusTotal, weekTotal, weekDone, streak, recent };
    }, [todos, categories, today]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tiles", children: [_jsxs("div", { className: "tile", children: [_jsx("span", { children: "\uC644\uB8CC\uD55C \uC77C" }), _jsxs("strong", { children: [r.doneTotal, "\uAC1C"] })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { children: "\uC774\uBC88 \uC8FC \uB2EC\uC131\uB960" }), _jsxs("strong", { children: [r.weekTotal ? Math.round((r.weekDone / r.weekTotal) * 100) : 0, "%"] }), _jsxs("small", { children: [r.weekDone, " / ", r.weekTotal] })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { children: "\uCD1D \uC9D1\uC911 \uC2DC\uAC04" }), _jsx("strong", { children: r.focusTotal ? formatDuration(r.focusTotal) : '0분' })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { children: "\uC5F0\uC18D \uB2EC\uC131" }), _jsxs("strong", { children: [r.streak, "\uC77C"] })] })] }), _jsx("h3", { className: "sub-title", children: "\uCD5C\uADFC 7\uC77C" }), _jsx("ul", { className: "rows", children: r.recent.map((d) => (_jsxs("li", { children: [_jsx("span", { children: dateLabel(d.key) }), _jsx("span", { className: "muted", children: d.focus > 0 && _jsx(Focus, { seconds: d.focus }) }), _jsx("span", { children: d.total ? `${d.done} / ${d.total}` : '-' })] }, d.key))) })] }));
}
function PerCategory({ todos, categories }) {
    const perCat = useMemo(() => categories
        .map((c) => {
        const list = todos.filter((t) => t.category_id === c.id);
        return { cat: c, done: list.filter((t) => t.done).length, total: list.length, focus: list.reduce((s, t) => s + t.focus_seconds, 0) };
    })
        .filter((x) => x.total > 0), [todos, categories]);
    if (!perCat.length)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("h3", { className: "sub-title", children: "\uCE74\uD14C\uACE0\uB9AC\uBCC4" }), _jsx("ul", { className: "rows", children: perCat.map(({ cat, done, total, focus }) => (_jsxs("li", { children: [_jsx("span", { style: { color: cat.color, fontWeight: 700 }, children: cat.name }), _jsx("span", { className: "muted", children: focus > 0 && _jsx(Focus, { seconds: focus }) }), _jsxs("span", { children: [done, " / ", total] })] }, cat.id))) })] }));
}
function TopFocus({ todos }) {
    const top = useMemo(() => todos
        .filter((t) => t.focus_seconds > 0)
        .sort((a, b) => b.focus_seconds - a.focus_seconds)
        .slice(0, 5), [todos]);
    if (!top.length)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("h3", { className: "sub-title", children: "\uAC00\uC7A5 \uC624\uB798 \uC9D1\uC911\uD55C \uC77C" }), _jsx("ul", { className: "rows", children: top.map((t) => (_jsxs("li", { children: [_jsx("span", { className: "ellipsis", children: t.title }), _jsx("span", { className: "muted", children: dateLabel(t.date) }), _jsx("span", { children: _jsx(Focus, { seconds: t.focus_seconds }) })] }, t.id))) })] }));
}
function dateLabel(k) {
    const today = todayKey();
    if (k === today)
        return '오늘';
    if (k === addDays(today, -1))
        return '어제';
    const d = fromKey(k);
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}
const THEMES = [
    ['basic', '기본'],
    ['chalk', '칠판'],
];
function ThemePicker() {
    const theme = useTheme();
    return (_jsxs("div", { className: "theme-picker", children: [_jsx("span", { className: "theme-label", children: "\uD14C\uB9C8" }), THEMES.map(([t, label]) => (_jsxs("button", { className: `theme-opt t-${t} ${theme === t ? 'on' : ''}`, onClick: () => setTheme(t), "aria-pressed": theme === t, children: [_jsx(Mascot, { size: 28, mood: theme === t ? 'happy' : 'base' }), label] }, t)))] }));
}
function TimetableToggle() {
    const on = useTimetableOn();
    const { courses } = useStore();
    // with classes saved the tab stays, so the switch would do nothing
    if (courses.length)
        return null;
    return (_jsxs("div", { className: "tt-toggle", children: [_jsxs("span", { children: ["\uB300\uD559\uC0DD \uC2DC\uAC04\uD45C", _jsx("small", { children: "\uC218\uC5C5\uC744 \uB123\uC73C\uBA74 \uD560 \uC77C \uD654\uBA74\uC5D0 \uADF8\uB0A0 \uC218\uC5C5\uC774 \uBCF4\uC5EC\uC694" })] }), _jsx("button", { className: `switch ${on ? 'on' : ''}`, role: "switch", "aria-checked": on, "aria-label": "\uB300\uD559\uC0DD \uC2DC\uAC04\uD45C", onClick: () => setTimetableOn(!on) })] }));
}
const Focus = ({ seconds }) => (_jsxs("span", { className: "focus-time", children: [_jsx(TomatoIcon, {}), " ", formatDuration(seconds)] }));
