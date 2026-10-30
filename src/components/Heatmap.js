import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, dayLabel, fromKey, todayKey, weekOf } from '../date';
/** a year to scroll back through */
const WEEKS = 53;
const ALL = 'all';
/** GitHub-style grid of finished todos, one column per week: about three months fit on screen, older weeks scroll in from the left. */
export default function Heatmap({ todos, categories }) {
    const [cat, setCat] = useState(ALL);
    const [picked, setPicked] = useState(null);
    const scroller = useRef(null);
    // leftmost column in view, so its month is always labelled
    const [firstCol, setFirstCol] = useState(0);
    const onScroll = () => {
        const el = scroller.current;
        const cell = el?.querySelector('.heat-cell')?.getBoundingClientRect().width;
        if (el && cell)
            setFirstCol(Math.round(el.scrollLeft / (cell + 4)));
    };
    const today = todayKey();
    const days = useMemo(() => {
        const start = addDays(weekOf(today)[0], -7 * (WEEKS - 1));
        return Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
    }, [today]);
    const counts = useMemo(() => {
        const m = new Map();
        for (const t of todos)
            if (t.done && (cat === ALL || t.category_id === cat))
                m.set(t.date, (m.get(t.date) ?? 0) + 1);
        return m;
    }, [todos, cat]);
    useEffect(() => {
        scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
        onScroll();
    }, []);
    const color = categories.find((c) => c.id === cat)?.color ?? 'var(--accent)';
    const total = days.reduce((s, d) => s + (counts.get(d) ?? 0), 0);
    const activeDays = days.filter((d) => counts.has(d)).length;
    const used = categories.filter((c) => todos.some((t) => t.done && t.category_id === c.id));
    return (_jsxs("div", { className: "heatmap", children: [_jsxs("div", { className: "chips", children: [_jsx("button", { className: cat === ALL ? 'on' : '', onClick: () => setCat(ALL), children: "\uC804\uCCB4" }), used.map((c) => (_jsx("button", { className: cat === c.id ? 'on' : '', style: cat === c.id ? { background: c.color } : undefined, onClick: () => setCat(c.id), children: c.name }, c.id)))] }), _jsxs("div", { className: "heat-scroll", ref: scroller, onScroll: onScroll, children: [_jsx("div", { className: "heat-months", children: Array.from({ length: WEEKS }, (_, w) => {
                            // label each week a month starts in, and the leftmost one in view (unless the next one is labelled anyway)
                            const week = days.slice(w * 7, w * 7 + 7);
                            const startsMonth = (ws) => ws.find((d) => d.endsWith('-01'));
                            const first = startsMonth(week) ?? (w === firstCol && !startsMonth(days.slice(w * 7 + 7, w * 7 + 14)) ? week[6] : undefined);
                            return _jsx("span", { children: first ? `${fromKey(first).getMonth() + 1}월` : '' }, w);
                        }) }), _jsx("div", { className: "heat-grid", children: days.map((d) => {
                            const n = counts.get(d) ?? 0;
                            return (_jsx("button", { className: `heat-cell ${d > today ? 'future' : ''} ${picked === d ? 'picked' : ''}`, style: n ? { background: color, opacity: Math.min(0.35 + n * 0.2, 1) } : undefined, onClick: () => setPicked(picked === d ? null : d), "aria-label": `${dayLabel(d)} ${n}개 완료` }, d));
                        }) })] }), _jsx("p", { className: "heat-info", children: picked ? `${dayLabel(picked)} · ${counts.get(picked) ?? 0}개 완료` : `최근 1년 동안 ${activeDays}일, ${total}개 완료` })] }));
}
