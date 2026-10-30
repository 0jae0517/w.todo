import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { todayKey } from '../date';
import { PHASE_LABEL, formatDuration, pause, phaseLength, reset, setSettings, setTodo, skip, start, timeLeft, useTimer } from '../pomodoro';
import Mascot from './Mascot';
import { ChevronDownIcon, ResetIcon, SkipIcon, TomatoIcon } from './Icons';
const fmt = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export default function Pomodoro({ todos }) {
    const t = useTimer();
    const [, tick] = useState(0);
    const [editing, setEditing] = useState(false);
    const running = t.endsAt !== null;
    useEffect(() => {
        if (!running)
            return;
        const id = setInterval(() => tick((n) => n + 1), 250);
        return () => clearInterval(id);
    }, [running]);
    const left = timeLeft(t);
    const total = phaseLength(t.settings, t.phase);
    const progress = 1 - left / total;
    const R = 110;
    const C = 2 * Math.PI * R;
    const today = todayKey();
    const candidates = todos.filter((x) => (x.date === today && !x.done) || x.id === t.todoId);
    const current = todos.find((x) => x.id === t.todoId);
    useEffect(() => {
        document.title = running ? `${fmt(left)} ${PHASE_LABEL[t.phase]}` : 'w.todo';
    });
    return (_jsxs("div", { className: "pomo", children: [_jsx("h2", { className: "pomo-task", children: current ? current.title : '집중할 일을 골라 주세요' }), current && current.focus_seconds > 0 && (_jsxs("p", { className: "pomo-total", children: ["\uC9C0\uAE08\uAE4C\uC9C0 ", formatDuration(current.focus_seconds), " \uC9D1\uC911 \u00B7 ", _jsx(TomatoIcon, {}), " ", current.pomodoros] })), _jsx(Mascot, { mood: !running ? 'base' : t.phase === 'focus' ? 'focus' : 'sleep', size: 76 }), _jsx("div", { className: "pomo-phases", children: ['focus', 'short', 'long'].map((p) => (_jsx("span", { className: p === t.phase ? 'on' : '', children: PHASE_LABEL[p] }, p))) }), _jsxs("div", { className: `pomo-ring ph-${t.phase}`, children: [_jsxs("svg", { viewBox: "0 0 260 260", children: [_jsx("circle", { cx: "130", cy: "130", r: R, className: "track" }), _jsx("circle", { cx: "130", cy: "130", r: R, className: "bar", strokeDasharray: C, strokeDashoffset: C * (1 - progress) })] }), _jsxs("div", { className: "pomo-time", children: [_jsx("strong", { children: fmt(left) }), _jsxs("span", { children: [t.round, " / ", t.settings.longEvery] })] })] }), _jsxs("div", { className: "pomo-controls", children: [_jsx("button", { onClick: reset, "aria-label": "\uCC98\uC74C\uBD80\uD130", children: _jsx(ResetIcon, {}) }), _jsx("button", { className: "primary big", onClick: running ? pause : start, children: running ? '일시정지' : '시작' }), _jsx("button", { onClick: skip, "aria-label": "\uAC74\uB108\uB6F0\uAE30", children: _jsx(SkipIcon, {}) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC9D1\uC911\uD560 \uC77C" }), _jsxs("select", { value: t.todoId ?? '', onChange: (e) => setTodo(e.target.value || null), children: [_jsx("option", { value: "", children: "\uC120\uD0DD \uC548 \uD568" }), candidates.map((x) => (_jsxs("option", { value: x.id, children: [x.title, x.date !== today ? ` (${x.date.slice(5).replace('-', '/')})` : ''] }, x.id)))] })] }), _jsxs("p", { className: "sheet-sub", children: ["\uC624\uB298 \uC9D1\uC911 ", t.history[today] ?? 0, "\uD68C"] }), _jsxs("button", { className: "link", onClick: () => setEditing(!editing), children: ["\uC2DC\uAC04 \uC124\uC815 ", _jsx("span", { className: `chev-inline ${editing ? 'open' : ''}`, children: _jsx(ChevronDownIcon, {}) })] }), editing && (_jsx("div", { className: "pomo-settings", children: [['focus', '집중(분)'], ['short', '짧은 휴식(분)'], ['long', '긴 휴식(분)'], ['longEvery', '긴 휴식 간격(회)']].map(([k, label]) => (_jsxs("label", { className: "field", children: [_jsx("span", { children: label }), _jsx("input", { type: "number", min: 1, max: 180, value: t.settings[k], onChange: (e) => {
                                const v = Math.round(Number(e.target.value));
                                if (v >= 1 && v <= 180)
                                    setSettings({ [k]: v });
                            } })] }, k))) }))] }));
}
