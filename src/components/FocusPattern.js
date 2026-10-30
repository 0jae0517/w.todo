import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { WEEKDAYS } from '../date';
import { formatDuration } from '../pomodoro';
const MIN_SESSIONS = 5;
const BLOCK = 3; // hours per column
const ROWS = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const blockLabel = (b) => {
    const h = b * BLOCK;
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시`;
};
/** When (weekday × time of day) Pomodoro focus sessions happen. */
export default function FocusPattern({ sessions }) {
    const p = useMemo(() => {
        const grid = Array.from({ length: 7 }, () => Array(24 / BLOCK).fill(0));
        const byDay = Array(7).fill(0);
        const byBlock = Array(24 / BLOCK).fill(0);
        for (const s of sessions) {
            const d = new Date(s.started_at);
            const b = Math.floor(d.getHours() / BLOCK);
            grid[d.getDay()][b] += s.seconds;
            byDay[d.getDay()] += s.seconds;
            byBlock[b] += s.seconds;
        }
        const max = Math.max(...grid.flat());
        const bestDay = byDay.indexOf(Math.max(...byDay));
        const bestBlock = byBlock.indexOf(Math.max(...byBlock));
        return { grid, max, bestDay, bestBlock };
    }, [sessions]);
    if (sessions.length < MIN_SESSIONS)
        return _jsxs("p", { className: "sheet-sub", children: ["\uBF40\uBAA8\uB3C4\uB85C\uB97C ", MIN_SESSIONS, "\uBC88 \uC774\uC0C1 \uB9C8\uCE58\uBA74 \uC5B8\uC81C \uC9D1\uC911\uC774 \uC798 \uB418\uB294\uC9C0 \uBCF4\uC5EC \uB4DC\uB824\uC694. (\uC9C0\uAE08 ", sessions.length, "\uBC88)"] });
    return (_jsxs("div", { className: "pattern", children: [_jsxs("p", { className: "pattern-summary", children: [_jsxs("b", { children: [WEEKDAYS[p.bestDay], "\uC694\uC77C"] }), ", ", _jsxs("b", { children: [blockLabel(p.bestBlock), "~", blockLabel(p.bestBlock + 1)] }), "\uC5D0 \uAC00\uC7A5 \uB9CE\uC774 \uC9D1\uC911\uD588\uC5B4\uC694."] }), _jsxs("div", { className: "pattern-grid", children: [_jsx("span", {}), p.grid[0].map((_, b) => (_jsx("span", { className: "pattern-head", children: b % 2 === 0 ? b * BLOCK : '' }, b))), ROWS.map((d) => (_jsxs("div", { className: "pattern-row", children: [_jsx("span", { className: `pattern-day ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`, children: WEEKDAYS[d] }), p.grid[d].map((sec, b) => (_jsx("span", { className: "pattern-cell", style: sec ? { opacity: 0.2 + 0.8 * (sec / p.max) } : { background: 'var(--bg)' }, title: sec ? `${WEEKDAYS[d]} ${blockLabel(b)}: ${formatDuration(sec)}` : undefined }, b)))] }, d)))] }), _jsxs("p", { className: "heat-info", children: ["\uCD1D ", sessions.length, "\uBC88 \uC9D1\uC911 \uAE30\uB85D \u00B7 \uC9C4\uD560\uC218\uB85D \uC624\uB798 \uC9D1\uC911\uD55C \uC2DC\uAC04\uB300"] })] }));
}
