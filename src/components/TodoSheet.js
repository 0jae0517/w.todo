import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { WEEKDAYS, addDays, dayLabel, fromKey, timeLabel, todayKey } from '../date';
import { deleteTodo, repeatStreak, setRepeat, stopRepeat, updateTodo, useStore } from '../store';
import { focusOn, formatDuration } from '../pomodoro';
import Sheet from './Sheet';
import TimeWheel from './TimeWheel';
import { TomatoIcon } from './Icons';
export default function TodoSheet({ todo, categories, reactions, onClose, onFocus }) {
    const [title, setTitle] = useState(todo.title);
    const [picking, setPicking] = useState(null);
    const routine = useStore().routines.find((r) => r.id === todo.routine_id);
    const saveTitle = () => {
        const t = title.trim();
        if (t && t !== todo.title)
            updateTodo(todo.id, { title: t });
    };
    const close = () => {
        saveTitle();
        onClose();
    };
    const moveTo = (date) => {
        saveTitle();
        updateTodo(todo.id, { date });
        onClose();
    };
    const today = todayKey();
    return (_jsxs(Sheet, { onClose: close, children: [_jsxs("p", { className: "sheet-sub todo-sheet-date", children: [dayLabel(todo.date), todo.focus_seconds > 0 && (_jsxs(_Fragment, { children: [' · ', _jsx(TomatoIcon, {}), " ", todo.pomodoros, "\uD68C, \uCD1D ", formatDuration(todo.focus_seconds), " \uC9D1\uC911"] })), routine && repeatStreak(routine.id) > 0 && ` · ${repeatStreak(routine.id)}일 연속 달성`] }), _jsx("input", { className: "sheet-input todo-sheet-title", value: title, onChange: (e) => setTitle(e.target.value), onKeyDown: (e) => e.key === 'Enter' && !e.nativeEvent.isComposing && close() }), reactions.length > 0 && (_jsx("ul", { className: "who-reacted", children: reactions.map((r) => (_jsxs("li", { children: [_jsx("span", { children: r.emoji }), " ", r.profile?.name || r.profile?.username, r.profile?.name && _jsxs("span", { className: "handle", children: [" @", r.profile.username] })] }, r.user_id))) })), !todo.done && (_jsxs("button", { className: "pomo-start", onClick: () => {
                    saveTitle();
                    focusOn(todo.id);
                    onFocus();
                }, children: [_jsx(TomatoIcon, {}), " \uBF40\uBAA8\uB3C4\uB85C \uC2DC\uC791"] })), _jsxs("div", { className: "actions", children: [todo.date !== today && _jsx("button", { onClick: () => moveTo(today), children: "\uC624\uB298 \uD558\uAE30" }), _jsx("button", { onClick: () => moveTo(addDays(todo.date, 1)), children: "\uB0B4\uC77C \uD558\uAE30" }), _jsxs("label", { className: "action-date", children: ["\uB0A0\uC9DC \uBC14\uAFB8\uAE30", _jsx("input", { type: "date", value: todo.date, onChange: (e) => e.target.value && moveTo(e.target.value) })] })] }), _jsxs("div", { className: "field", children: [_jsx("span", { children: "\uC2DC\uAC04" }), _jsx("button", { className: "time-btn", onClick: () => setPicking(picking === 'time' ? null : 'time'), children: todo.time ? timeLabel(todo.time) : '정하지 않음' })] }), picking === 'time' && (_jsx(TimeWheel, { value: todo.time, onDone: (time) => {
                    updateTodo(todo.id, { time });
                    setPicking(null);
                }, onClear: () => {
                    updateTodo(todo.id, { time: null });
                    setPicking(null);
                } })), _jsxs("div", { className: "field", children: [_jsx("span", { children: "\uBC18\uBCF5" }), _jsx("button", { className: "time-btn", onClick: () => setPicking(picking === 'repeat' ? null : 'repeat'), children: routine ? repeatLabel(routine.days) : '반복 안 함' })] }), picking === 'repeat' && (_jsx(RepeatPicker, { value: routine?.days ?? [fromKey(todo.date).getDay()], repeating: !!routine, onDone: (days) => {
                    saveTitle();
                    setRepeat(todo.id, days);
                    setPicking(null);
                }, onStop: () => {
                    stopRepeat(todo.id);
                    setPicking(null);
                } })), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uCE74\uD14C\uACE0\uB9AC" }), _jsx("select", { value: todo.category_id, onChange: (e) => updateTodo(todo.id, { category_id: e.target.value }), children: categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id))) })] }), _jsx("button", { className: "danger", onClick: () => {
                    deleteTodo(todo.id);
                    onClose();
                }, children: "\uC0AD\uC81C" })] }));
}
const PRESETS = [
    ['매일', [0, 1, 2, 3, 4, 5, 6]],
    ['평일', [1, 2, 3, 4, 5]],
    ['주말', [0, 6]],
];
/** "매일", "평일", "월·수·금" */
export function repeatLabel(days) {
    const sorted = [...days].sort();
    const preset = PRESETS.find(([, d]) => d.join() === sorted.join());
    if (preset)
        return preset[0];
    // Monday-first reads more naturally
    return [...sorted.filter((d) => d > 0), ...sorted.filter((d) => d === 0)].map((d) => WEEKDAYS[d]).join('·') + (days.length === 1 ? '요일마다' : '');
}
function RepeatPicker({ value, repeating, onDone, onStop }) {
    const [days, setDays] = useState(value);
    const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
    return (_jsxs("div", { className: "repeat-box", children: [_jsx("div", { className: "repeat-presets", children: PRESETS.map(([label, d]) => (_jsx("button", { className: [...days].sort().join() === d.join() ? 'on' : '', onClick: () => setDays(d), children: label }, label))) }), _jsx("div", { className: "repeat-days", children: [1, 2, 3, 4, 5, 6, 0].map((d) => (_jsx("button", { className: `${days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`, onClick: () => toggle(d), children: WEEKDAYS[d] }, d))) }), _jsxs("div", { className: "actions", children: [repeating && _jsx("button", { onClick: onStop, children: "\uBC18\uBCF5 \uB044\uAE30" }), _jsx("button", { className: "primary", disabled: !days.length, onClick: () => onDone(days), children: "\uD655\uC778" })] })] }));
}
