import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { setOfficeHidden, spotOf, useOffice, useOfficeHidden } from '../office';
import { useTimer } from '../pomodoro';
import { useMyProfile } from '../social';
import { useStore } from '../store';
import Sheet from './Sheet';
/*
 * The pixel office, drawn as an SVG of 1-unit squares so it stays crisp at any size.
 * Desks on the left (one per person focusing), a lounge with a sofa on the right.
 */
const W = 150;
const COLS = 3;
const CELL_W = 30;
const CELL_H = 40;
const DESK_TOP = 36;
const LOUNGE_X = 100;
// ---- sprites ('.' is transparent) ----
const TODO = [
    '...K.K.K......',
    '....K.K...YY..',
    '...KKKKKKKYY..',
    '..KBBBBBBBBK..',
    '.KBBBBBBBBBBK.',
    '.KBBEBBBBEBBK.',
    '.KBBEBBBBEBBK.',
    '.KPBBBMMBBBPK.',
    '.KBBBBBBBBBBK.',
    '..KBBBBBBBBK..',
    '...KKKKKKKK...',
    '....K....K....',
];
// focusing: a pink headband and narrowed eyes, like 토도's focus face
const TODO_FOCUS = TODO.map((r, i) => (i === 3 ? '..KPPPPPPPPK..' : i === 5 ? '.KBBBBBBBBBBK.' : i === 6 ? '.KBEEBBBBEEBK.' : r));
// the chair's back, peeking over the desk
const CHAIR = ['..GGGGGGGG..', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.'];
const PLANT = ['..L.L...', '.LLLLL..', 'LLDLLLL.', '.LLLDLL.', '..LLL...', '.PPPPP..', '.PQQQP..', '..PPP...'];
const BASE = {
    K: '#3b3f4c',
    Y: '#ffd43b',
    P: '#f19aa1',
    E: '#3b3f4c',
    M: '#e0707a',
    G: '#8a7a9e',
    H: '#b3a6c4',
    L: '#5fbf7f',
    D: '#3f9a5f',
    Q: '#b9744f',
};
const TINTS = ['#ffffff', '#ffd6e0', '#c8f0d8', '#cfe6ff', '#fff1b8', '#e3d4ff', '#ffdcc2'];
function tintOf(id) {
    let h = 0;
    for (const c of id)
        h = (h * 31 + c.charCodeAt(0)) | 0;
    return TINTS[Math.abs(h) % TINTS.length];
}
/** One sprite as merged runs of squares. */
function Pix({ x, y, rows, colors }) {
    const out = [];
    rows.forEach((row, j) => {
        let i = 0;
        while (i < row.length) {
            const c = row[i];
            let n = 1;
            while (row[i + n] === c)
                n++;
            if (c !== '.')
                out.push(_jsx("rect", { x: x + i, y: y + j, width: n, height: 1, fill: colors[c] ?? c }, `${j}-${i}`));
            i += n;
        }
    });
    return _jsx("g", { children: out });
}
const Todo = ({ x, y, id, focus }) => (_jsx("g", { className: "office-char", children: _jsx(Pix, { x: x, y: y, rows: focus ? TODO_FOCUS : TODO, colors: { ...BASE, B: tintOf(id) } }) }));
function Desk({ x, y, on }) {
    return (_jsxs("g", { children: [_jsx("rect", { x: x + 2, y: y + 9, width: 8, height: 7, fill: "#4a4f5c" }), _jsx("rect", { x: x + 3, y: y + 10, width: 6, height: 5, fill: on ? '#8fd8ff' : '#2d313b' }), on && _jsx("rect", { x: x + 4, y: y + 11, width: 3, height: 1, fill: "#e8f7ff" }), _jsx("rect", { x: x + 5, y: y + 16, width: 2, height: 1, fill: "#4a4f5c" }), _jsx("rect", { x: x + 1, y: y + 17, width: 28, height: 3, fill: "#c98f5a" }), _jsx("rect", { x: x + 1, y: y + 20, width: 28, height: 8, fill: "#a8703f" }), _jsx("rect", { x: x + 6, y: y + 22, width: 18, height: 5, fill: "#f6ead8" }), _jsx("rect", { x: x + 24, y: y + 14, width: 3, height: 3, fill: "#ffffff" }), _jsx("rect", { x: x + 27, y: y + 15, width: 1, height: 1, fill: "#ffffff" })] }));
}
function layout(here, now) {
    const desk = here.filter((m) => spotOf(m.status, now) === 'desk');
    const sofa = here.filter((m) => spotOf(m.status, now) === 'sofa');
    const lounge = here.filter((m) => spotOf(m.status, now) === 'lounge');
    const deskRows = Math.max(2, Math.ceil(desk.length / COLS));
    const H = DESK_TOP + deskRows * CELL_H + 4;
    const sofaY = H - 30;
    const placed = [];
    desk.forEach((mate, i) => {
        const cx = 3 + (i % COLS) * CELL_W;
        const cy = DESK_TOP + Math.floor(i / COLS) * CELL_H;
        placed.push({ mate, x: cx + 10, y: cy + 4, spot: 'desk' });
    });
    // three on the sofa; more breakers stand in the lounge
    sofa.slice(0, 3).forEach((mate, i) => placed.push({ mate, x: LOUNGE_X + 2 + i * 15, y: sofaY + 3, spot: 'sofa' }));
    const standing = [...sofa.slice(3), ...lounge];
    const perRow = 3;
    const rowsFit = Math.max(1, Math.floor((sofaY - 52) / 22));
    standing.forEach((mate, i) => {
        const row = Math.floor(i / perRow) % rowsFit;
        const col = i % perRow;
        // a slight stagger so a crowd still reads as people
        placed.push({ mate, x: LOUNGE_X + 2 + col * 15 + (row % 2) * 2, y: 46 + row * 22, spot: 'lounge' });
    });
    return { placed, H, sofaY, deskRows };
}
const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const left = (s, now) => (s?.ends_at ? Date.parse(s.ends_at) - now : 0);
const nameOf = (p) => p.name || p.username;
export default function Office({ onOpenFriend }) {
    const { profile } = useMyProfile();
    const { mates, err } = useOffice(profile);
    const timer = useTimer();
    const { todos } = useStore();
    const hidden = useOfficeHidden();
    const [now, setNow] = useState(Date.now);
    const [open, setOpen] = useState(null);
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    if (err)
        return _jsx("p", { className: "empty", children: err });
    if (!mates || !profile)
        return _jsx("p", { className: "empty", children: "\uC624\uD53C\uC2A4 \uC5EC\uB294 \uC911\u2026" });
    // I'm shown from this device's timer, so it's right even before the server catches up
    const mine = {
        user_id: profile.id,
        phase: timer.endsAt ? timer.phase : 'idle',
        todo_id: timer.endsAt ? timer.todoId : null,
        ends_at: timer.endsAt ? new Date(timer.endsAt).toISOString() : null,
        seen_at: new Date(now).toISOString(),
    };
    const myTitle = mine.todo_id ? (todos.find((t) => t.id === mine.todo_id)?.title ?? null) : null;
    const all = mates.map((m) => (m.profile.id === profile.id ? { ...m, status: mine, todoTitle: myTitle } : m));
    const away = all.filter((m) => spotOf(m.status, now) === 'away');
    const selected = all.find((m) => m.profile.id === open);
    return (_jsxs("div", { className: "office", children: [_jsx(OfficeRoom, { all: all, meId: profile.id, now: now, onTap: setOpen }), all.length === 1 && _jsx("p", { className: "office-note", children: "\uC11C\uB85C \uD314\uB85C\uC6B0\uD558\uB294 \uCE5C\uAD6C\uAC00 \uC0DD\uAE30\uBA74 \uC5EC\uAE30\uC11C \uAC19\uC774 \uC77C\uD574\uC694." }), away.length > 0 && (_jsxs("div", { className: "office-away", children: [_jsx("span", { className: "office-away-label", children: "\uC790\uB9AC \uBE44\uC6C0" }), away.map((m) => (_jsx("button", { className: "office-away-chip", onClick: () => setOpen(m.profile.id), children: m.profile.id === profile.id ? '나' : nameOf(m.profile) }, m.profile.id)))] })), _jsxs("label", { className: "office-toggle", children: [_jsx("input", { type: "checkbox", checked: !hidden, onChange: (e) => setOfficeHidden(!e.target.checked) }), "\uCE5C\uAD6C\uB4E4\uC5D0\uAC8C \uB0B4 \uBAA8\uC2B5 \uBCF4\uC774\uAE30"] }), selected && (_jsx(MateSheet, { mate: selected, isMe: selected.profile.id === profile.id, now: now, hidden: hidden, onClose: () => setOpen(null), onOpenFriend: () => {
                    setOpen(null);
                    onOpenFriend(selected.profile);
                } }))] }));
}
function MateSheet({ mate, isMe, now, hidden, onClose, onOpenFriend }) {
    const spot = spotOf(mate.status, now);
    const ms = left(mate.status, now);
    const status = spot === 'desk'
        ? `${mate.todoTitle ? `「${mate.todoTitle}」` : '할 일'}에 집중하고 있어요 · ${clock(ms)} 남음`
        : spot === 'sofa'
            ? `쉬는 중이에요 · ${clock(ms)} 남음`
            : spot === 'lounge'
                ? '오피스에 있어요'
                : '자리에 없어요';
    return (_jsxs(Sheet, { title: isMe ? '나' : nameOf(mate.profile), onClose: onClose, children: [!isMe && _jsxs("p", { className: "sheet-sub", children: ["@", mate.profile.username] }), _jsx("p", { className: "office-status-line", children: status }), isMe && hidden && _jsx("p", { className: "sheet-sub", children: "\uC9C0\uAE08\uC740 \uCE5C\uAD6C\uB4E4\uC5D0\uAC8C \uB0B4 \uBAA8\uC2B5\uC774 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694." }), !isMe && (_jsx("button", { className: "primary", onClick: onOpenFriend, children: "\uD560 \uC77C \uBCF4\uACE0 \uC751\uC6D0\uD558\uAE30" }))] }));
}
/** The room itself: who sits where, drawn from statuses. */
export function OfficeRoom({ all, meId, now, onTap }) {
    const here = all.filter((m) => spotOf(m.status, now) !== 'away');
    const { placed, H, sofaY, deskRows } = layout(here, now);
    return (_jsxs("div", { className: "office-room", style: { aspectRatio: `${W} / ${H}` }, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, shapeRendering: "crispEdges", "aria-hidden": "true", children: [_jsx("rect", { x: 0, y: 0, width: W, height: 30, fill: "#f3e9dc" }), _jsx("rect", { x: 0, y: 28, width: W, height: 2, fill: "#d9c7b0" }), [8, 50].map((wx) => (_jsxs("g", { children: [_jsx("rect", { x: wx, y: 6, width: 30, height: 16, fill: "#8c6a4a" }), _jsx("rect", { x: wx + 2, y: 8, width: 12, height: 12, fill: "#bfe6ff" }), _jsx("rect", { x: wx + 16, y: 8, width: 12, height: 12, fill: "#bfe6ff" }), _jsx("rect", { x: wx + 4, y: 10, width: 4, height: 2, fill: "#ffffff" })] }, wx))), _jsx("rect", { x: 89, y: 8, width: 9, height: 9, fill: "#3b3f4c" }), _jsx("rect", { x: 90, y: 9, width: 7, height: 7, fill: "#ffffff" }), _jsx("rect", { x: 93, y: 10, width: 1, height: 3, fill: "#3b3f4c" }), _jsx("rect", { x: 93, y: 12, width: 2, height: 1, fill: "#3b3f4c" }), _jsx("rect", { x: 0, y: 30, width: W, height: H - 30, fill: "#ead8bb" }), Array.from({ length: Math.ceil((H - 30) / 8) }, (_, i) => (_jsx("rect", { x: 0, y: 37 + i * 8, width: W, height: 1, fill: "#e0caa6" }, i))), _jsx("rect", { x: LOUNGE_X, y: 42, width: 48, height: sofaY - 44, fill: "#f6cfd3" }), _jsx("rect", { x: LOUNGE_X + 2, y: 44, width: 44, height: sofaY - 48, fill: "#f9dde0" }), _jsx("rect", { x: 118, y: 18, width: 30, height: 14, fill: "#a8703f" }), _jsx("rect", { x: 118, y: 18, width: 30, height: 2, fill: "#c98f5a" }), _jsx("rect", { x: 122, y: 8, width: 9, height: 10, fill: "#5b6170" }), _jsx("rect", { x: 124, y: 10, width: 5, height: 3, fill: "#2d313b" }), _jsx("rect", { x: 125, y: 15, width: 3, height: 3, fill: "#ffffff" }), _jsx("rect", { x: 136, y: 13, width: 4, height: 5, fill: "#ffffff" }), _jsx(Pix, { x: 102, y: 22, rows: PLANT, colors: BASE }), Array.from({ length: deskRows * COLS }, (_, i) => {
                        const cx = 3 + (i % COLS) * CELL_W;
                        const cy = DESK_TOP + Math.floor(i / COLS) * CELL_H;
                        const p = placed.filter((q) => q.spot === 'desk')[i];
                        return (_jsxs("g", { children: [_jsx(Pix, { x: cx + 11, y: cy + 9, rows: CHAIR, colors: BASE }), p && _jsx(Todo, { x: p.x, y: p.y, id: p.mate.profile.id, focus: true }), _jsx(Desk, { x: cx, y: cy, on: !!p })] }, i));
                    }), _jsx("rect", { x: LOUNGE_X + 1, y: sofaY, width: 46, height: 10, fill: "#6f86d6" }), placed
                        .filter((p) => p.spot === 'sofa')
                        .map((p) => (_jsx(Todo, { x: p.x, y: p.y, id: p.mate.profile.id }, p.mate.profile.id))), _jsx("rect", { x: LOUNGE_X - 1, y: sofaY + 13, width: 50, height: 9, fill: "#5e6ad2" }), _jsx("rect", { x: LOUNGE_X - 2, y: sofaY + 6, width: 4, height: 16, fill: "#4b55b0" }), _jsx("rect", { x: LOUNGE_X + 46, y: sofaY + 6, width: 4, height: 16, fill: "#4b55b0" }), placed
                        .filter((p) => p.spot === 'lounge')
                        .map((p) => (_jsx(Todo, { x: p.x, y: p.y, id: p.mate.profile.id }, p.mate.profile.id)))] }), placed.map((p) => {
                const pct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
                const ms = left(p.mate.status, now);
                const isMe = p.mate.profile.id === meId;
                return (_jsxs("div", { children: [p.spot !== 'lounge' && (_jsxs("span", { className: `office-bubble ${p.spot}`, style: pct(p.x + 7, p.y - 1), children: [p.spot === 'desk' && _jsx("span", { className: "office-bubble-title", children: p.mate.todoTitle ?? '집중 중' }), p.spot === 'sofa' && _jsx("span", { className: "office-bubble-title", children: "\uD734\uC2DD" }), _jsx("b", { children: clock(ms) })] })), _jsx("span", { className: `office-name ${p.spot}${isMe ? ' me' : ''}`, style: p.spot === 'desk' ? pct(p.x + 5, p.y + 20) : pct(p.x + 7, p.y + (p.spot === 'sofa' ? 20 : 13)), children: isMe ? '나' : nameOf(p.mate.profile) }), _jsx("button", { className: "office-hit", style: { ...pct(p.x - 1, p.y - 1), width: `${(16 / W) * 100}%`, height: `${(14 / H) * 100}%` }, onClick: () => onTap(p.mate.profile.id), "aria-label": `${nameOf(p.mate.profile)} 보기` })] }, p.mate.profile.id));
            }), !placed.some((p) => p.spot === 'desk') && _jsx("span", { className: "office-hint", children: "\uBF40\uBAA8\uB3C4\uB85C\uB97C \uC2DC\uC791\uD558\uBA74 \uCC45\uC0C1\uC5D0 \uC549\uC544\uC694" })] }));
}
