import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { WEEKDAYS, timeLabel, todayKey } from '../date';
import { PALETTE, deleteCourse, saveCourse, setTerm, useStore } from '../store';
import { classesOn, currentTerm, termLabel, toMinutes } from '../timetable';
import { CloseIcon, PencilIcon } from './Icons';
import Sheet from './Sheet';
import TimeWheel from './TimeWheel';
const HOUR = 52;
/** Monday first, like most timetables. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
/** The weekly grid of classes, 에브리타임 style. */
export default function Timetable() {
    const { courses } = useStore();
    const [editing, setEditing] = useState(null);
    const [termOpen, setTermOpen] = useState(false);
    const term = currentTerm(courses);
    const slots = courses.flatMap((c) => c.slots.map((s) => ({ course: c, slot: s })));
    const used = new Set(slots.map((s) => s.slot.day));
    const days = ORDER.filter((d) => d >= 1 && d <= 5 || used.has(d));
    const first = Math.min(9, ...slots.map((s) => Math.floor(toMinutes(s.slot.start) / 60)));
    const last = Math.max(18, ...slots.map((s) => Math.ceil(toMinutes(s.slot.end) / 60)));
    const hours = Array.from({ length: last - first }, (_, i) => first + i);
    const today = new Date().getDay();
    return (_jsxs("main", { className: "timetable", children: [_jsxs("div", { className: "tt-head", children: [_jsxs("button", { className: "tt-term", onClick: () => courses.length && setTermOpen(true), disabled: !courses.length, children: [termLabel(term), courses.length > 0 && _jsx(PencilIcon, {})] }), _jsx("button", { className: "primary tt-add", onClick: () => setEditing('new'), children: "+ \uC218\uC5C5 \uCD94\uAC00" })] }), _jsxs("div", { className: "tt-grid", style: { gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }, children: [_jsx("div", {}), days.map((d) => (_jsx("div", { className: `tt-day ${d === today ? 'today' : ''}`, children: WEEKDAYS[d] }, d))), _jsx("div", { className: "tt-hours", children: hours.map((h) => (_jsx("div", { style: { height: HOUR }, children: h > 12 ? h - 12 : h }, h))) }), days.map((d) => (_jsxs("div", { className: "tt-col", style: { height: hours.length * HOUR }, children: [hours.map((h) => (_jsx("div", { className: "tt-line", style: { top: (h - first) * HOUR } }, h))), slots
                                .filter((s) => s.slot.day === d)
                                .map(({ course, slot }, i) => (_jsxs("button", { className: "tt-block", style: {
                                    top: ((toMinutes(slot.start) - first * 60) / 60) * HOUR,
                                    height: Math.max(22, ((toMinutes(slot.end) - toMinutes(slot.start)) / 60) * HOUR - 2),
                                    background: course.color,
                                }, onClick: () => setEditing(course), children: [_jsx("strong", { children: course.title }), course.room && _jsx("span", { children: course.room })] }, course.id + i)))] }, d)))] }), !courses.length && _jsx("p", { className: "sheet-sub tt-empty", children: "\uC218\uC5C5\uC744 \uCD94\uAC00\uD558\uBA74 \uD559\uAE30 \uB3D9\uC548 \uD560 \uC77C \uD654\uBA74\uC5D0\uB3C4 \uADF8\uB0A0 \uC218\uC5C5\uC774 \uC790\uB3D9\uC73C\uB85C \uBCF4\uC5EC\uC694." }), editing && _jsx(CourseSheet, { course: editing === 'new' ? undefined : editing, onClose: () => setEditing(null) }), termOpen && _jsx(TermSheet, { term: term, onClose: () => setTermOpen(false) })] }));
}
/** Today's classes, shown above the day's todos. */
export function DayClasses({ date, onOpen }) {
    const { courses } = useStore();
    const list = classesOn(date, courses);
    if (!list.length)
        return null;
    const now = date === todayKey() ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
    return (_jsxs("section", { className: "day-classes", children: [_jsx("h3", { className: "group-label", children: "\uC218\uC5C5" }), _jsx("ul", { children: list.map(({ course, slot }, i) => (_jsx("li", { className: now >= toMinutes(slot.end) ? 'over' : '', children: _jsxs("button", { onClick: () => onOpen(course), children: [_jsx("span", { className: "class-bar", style: { background: course.color } }), _jsxs("span", { className: "class-time", children: [timeLabel(slot.start), _jsxs("small", { children: [" ~ ", timeLabel(slot.end).replace(/^오[전후] /, '')] })] }), _jsx("span", { className: "class-title", children: course.title }), course.room && _jsx("span", { className: "muted class-room", children: course.room })] }) }, course.id + i))) })] }));
}
export function CourseSheet({ course, onClose }) {
    const { courses } = useStore();
    const [title, setTitle] = useState(course?.title ?? '');
    const [room, setRoom] = useState(course?.room ?? '');
    const [color, setColor] = useState(course?.color ?? PALETTE.find((p) => !courses.some((c) => c.color === p)) ?? PALETTE[courses.length % PALETTE.length]);
    const [slots, setSlots] = useState(course?.slots ?? [{ day: 1, start: '09:00', end: '10:15' }]);
    const [picking, setPicking] = useState(null);
    const patch = (i, p) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...p } : s)));
    const valid = title.trim() && slots.length && slots.every((s) => s.start < s.end);
    const save = () => {
        if (!valid)
            return;
        saveCourse({ id: course?.id, title: title.trim(), room: room.trim(), color, slots, ...pickTerm(course, courses) });
        onClose();
    };
    return (_jsxs(Sheet, { onClose: onClose, title: course ? '수업 수정' : '수업 추가', children: [_jsx("input", { className: "sheet-input", placeholder: "\uC218\uC5C5 \uC774\uB984 (\uC608: \uC790\uB8CC\uAD6C\uC870)", value: title, onChange: (e) => setTitle(e.target.value), autoFocus: !course }), _jsx("input", { className: "sheet-input small", placeholder: "\uAC15\uC758\uC2E4 (\uC120\uD0DD)", value: room, onChange: (e) => setRoom(e.target.value) }), _jsx("div", { className: "swatches", children: PALETTE.map((p) => (_jsx("button", { className: `swatch ${p === color ? 'on' : ''}`, style: { background: p }, onClick: () => setColor(p), "aria-label": "\uC0C9\uC0C1" }, p))) }), _jsx("h3", { className: "sub-title", children: "\uC218\uC5C5 \uC2DC\uAC04" }), slots.map((s, i) => (_jsxs("div", { className: "slot", children: [_jsx("div", { className: "repeat-days", children: ORDER.map((d) => (_jsx("button", { className: `${s.day === d ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`, onClick: () => patch(i, { day: d }), children: WEEKDAYS[d] }, d))) }), _jsxs("div", { className: "slot-times", children: [_jsx("button", { className: "time-btn", onClick: () => setPicking({ i, edge: 'start' }), children: timeLabel(s.start) }), _jsx("span", { children: "~" }), _jsx("button", { className: "time-btn", onClick: () => setPicking({ i, edge: 'end' }), children: timeLabel(s.end) }), slots.length > 1 && (_jsx("button", { className: "slot-remove", onClick: () => setSlots(slots.filter((_, j) => j !== i)), "aria-label": "\uC774 \uC2DC\uAC04 \uBE7C\uAE30", children: _jsx(CloseIcon, {}) }))] }), s.start >= s.end && _jsx("p", { className: "error", children: "\uB05D\uB098\uB294 \uC2DC\uAC04\uC774 \uC2DC\uC791\uBCF4\uB2E4 \uB2A6\uC5B4\uC57C \uD574\uC694" }), picking?.i === i && (_jsx(TimeWheel, { value: s[picking.edge], clearLabel: "\uCDE8\uC18C", onClear: () => setPicking(null), onDone: (t) => {
                            const p = { [picking.edge]: t };
                            // moving the start keeps the class length
                            if (picking.edge === 'start')
                                p.end = shift(t, toMinutes(s.end) - toMinutes(s.start));
                            patch(i, p);
                            setPicking(null);
                        } }, picking.edge))] }, i))), _jsx("button", { className: "link-btn", onClick: () => {
                    const l = slots[slots.length - 1];
                    // MWF / TTh patterns are the common ones
                    setSlots([...slots, { ...l, day: l.day + 2 <= 5 ? l.day + 2 : 1 }]);
                }, children: "+ \uB2E4\uB978 \uC694\uC77C\u00B7\uC2DC\uAC04 \uCD94\uAC00" }), _jsx("button", { className: "primary wide", disabled: !valid, onClick: save, children: "\uC800\uC7A5" }), course && (_jsx("button", { className: "danger", onClick: () => {
                    if (!confirm(`'${course.title}' 수업을 시간표에서 지울까요?`))
                        return;
                    deleteCourse(course.id);
                    onClose();
                }, children: "\uC0AD\uC81C" }))] }));
}
/** A class keeps its own term; a new one joins the timetable's current term. */
function pickTerm(course, courses) {
    return course ? { term_start: course.term_start, term_end: course.term_end } : currentTerm(courses);
}
function shift(hhmm, minutes) {
    const m = Math.min(23 * 60 + 55, toMinutes(hhmm) + minutes);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function TermSheet({ term, onClose }) {
    const [start, setStart] = useState(term.term_start);
    const [end, setEnd] = useState(term.term_end);
    const valid = start && end && start < end;
    return (_jsxs(Sheet, { onClose: onClose, title: "\uD559\uAE30 \uAE30\uAC04", children: [_jsx("p", { className: "sheet-sub", children: "\uC774 \uAE30\uAC04 \uB3D9\uC548 \uB9E4\uC8FC \uC218\uC5C5\uC774 \uD560 \uC77C \uD654\uBA74\uC5D0 \uBCF4\uC5EC\uC694. \uACF5\uD734\uC77C\uC5D0\uB294 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694." }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uAC1C\uAC15" }), _jsx("input", { type: "date", value: start, onChange: (e) => setStart(e.target.value) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC885\uAC15" }), _jsx("input", { type: "date", value: end, onChange: (e) => setEnd(e.target.value) })] }), _jsx("button", { className: "primary wide", disabled: !valid, onClick: () => {
                    setTerm(start, end);
                    onClose();
                }, children: "\uC800\uC7A5" })] }));
}
