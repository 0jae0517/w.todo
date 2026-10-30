import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { timeLabel } from '../date';
import { formatDuration } from '../pomodoro';
import { addTodo, reorderCategories, reorderTodos, updateTodo, useStore } from '../store';
import { CheckMarkIcon, LockIcon, MoreIcon, PersonIcon, PlusIcon, RepeatIcon, TomatoIcon } from './Icons';
import ReactionBar from './ReactionBar';
import { repeatLabel } from './TodoSheet';
import { useDragSort } from './useDragSort';
const FOLD_KEY = 'todo-app:folded';
/** Folded category ids. Own list remembers them on this device; a friend's list only for the visit. */
function useFolded(persist) {
    const [folded, setFolded] = useState(() => {
        if (!persist)
            return new Set();
        try {
            return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]'));
        }
        catch {
            return new Set();
        }
    });
    const toggle = (id, fold = !folded.has(id)) => {
        const next = new Set(folded);
        if (fold)
            next.add(id);
        else
            next.delete(id);
        setFolded(next);
        if (persist)
            try {
                localStorage.setItem(FOLD_KEY, JSON.stringify([...next]));
            }
            catch {
                // not remembered, that's fine
            }
    };
    return { folded, toggle };
}
const ORPHAN = {
    id: '',
    name: '카테고리 없음',
    color: '#8a8f98',
    visibility: 'followers',
    allowed_ids: [],
    private: false,
    position: 0,
    deleted: false,
    updated_at: '',
};
export default function DayList({ date, categories, todos, reactions, myId, onOpenTodo, onReact }) {
    const [adding, setAdding] = useState(null);
    const editable = !!onOpenTodo;
    const known = new Set(categories.map((c) => c.id));
    const orphans = todos.filter((t) => !known.has(t.category_id));
    const groups = (orphans.length ? [...categories, ORPHAN] : categories).filter((c) => editable || todos.some((t) => t.category_id === c.id));
    const sortable = editable ? categories.map((c) => c.id) : [];
    const dnd = useDragSort(sortable, reorderCategories);
    const { folded, toggle } = useFolded(editable);
    if (!groups.length) {
        return _jsx("p", { className: "empty", children: editable ? '카테고리를 먼저 만들어 주세요. 오른쪽 위 + 버튼에서 추가할 수 있어요.' : '이 날은 공개된 할 일이 없어요.' });
    }
    return (_jsx("div", { className: "day-list", children: groups.map((cat) => {
            const items = (cat === ORPHAN ? orphans : todos.filter((t) => t.category_id === cat.id)).sort(byPosition);
            const c = { '--c': cat.color };
            const key = cat.id || 'orphan';
            const isFolded = folded.has(key) && adding !== cat.id;
            return (_jsxs("section", { ref: editable && cat !== ORPHAN ? dnd.register(cat.id) : undefined, className: `group ${dnd.dragging === cat.id ? 'dragging' : ''}`, style: dnd.styleFor(cat.id), children: [_jsxs("div", { className: "group-bar", children: [_jsxs("button", { className: "group-head", style: c, disabled: !editable || cat === ORPHAN, onPointerDown: editable && cat !== ORPHAN ? dnd.start(cat.id) : undefined, onContextMenu: (e) => editable && e.preventDefault(), onClick: () => {
                                    if (dnd.justDragged.current)
                                        return;
                                    if (adding !== cat.id)
                                        toggle(key, false);
                                    setAdding(adding === cat.id ? null : cat.id);
                                }, children: [_jsx("span", { className: "group-name", children: cat.name }), cat.visibility === 'private' && (_jsx("span", { className: "lock", title: "\uB098\uB9CC \uBCF4\uAE30", children: _jsx(LockIcon, {}) })), cat.visibility === 'selected' && (_jsx("span", { className: "lock", title: "\uC77C\uBD80 \uACF5\uAC1C", children: _jsx(PersonIcon, {}) })), editable && cat !== ORPHAN && (_jsx("span", { className: "group-add", children: _jsx(PlusIcon, {}) }))] }), items.length > 0 && (_jsxs("button", { className: "fold", onClick: () => toggle(key), "aria-expanded": !isFolded, "aria-label": isFolded ? '펼치기' : '접기', children: [isFolded && (_jsxs("span", { className: "fold-count", children: [items.filter((t) => t.done).length, "/", items.length] })), _jsx("svg", { className: `chev ${isFolded ? 'closed' : ''}`, viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true", children: _jsx("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })] }))] }), !isFolded && (_jsx(TodoItems, { items: items, color: c, editable: editable, reactions: reactions, myId: myId, onOpenTodo: onOpenTodo, onReact: onReact, adding: adding === cat.id ? (title) => addTodo(title, date, cat.id) : null, onAddDone: () => setAdding(null) }))] }, cat.id || 'orphan'));
        }) }));
}
/** manual order (a todo given a time is first slotted in by time, see updateTodo) */
/** "매일", "평일", "월·수·금", "매주 월" */
function shortRepeat(days) {
    const label = repeatLabel(days);
    return label.endsWith('요일마다') ? `매주 ${label.replace('요일마다', '')}` : label;
}
const byPosition = (a, b) => a.position - b.position || (a.time ?? '~').localeCompare(b.time ?? '~');
/** One category's todos; in my own list they can be dragged into a new order. */
function TodoItems({ items, color: c, editable, reactions, myId, onOpenTodo, onReact, adding, onAddDone }) {
    const dnd = useDragSort(editable ? items.map((t) => t.id) : [], reorderTodos);
    // my own routines; a friend's list shows just the icon
    const { routines } = useStore();
    const repeatDays = new Map(editable ? routines.map((r) => [r.id, r.days]) : []);
    // a tap that ends a drag shouldn't also tick or open the todo
    const tap = (fn) => () => !dnd.justDragged.current && fn();
    return (_jsxs("ul", { children: [items.map((t) => (_jsxs("li", { ref: editable ? dnd.register(t.id) : undefined, className: `todo ${t.done ? 'done' : ''} ${dnd.dragging === t.id ? 'dragging' : ''}`, style: dnd.styleFor(t.id), children: [_jsxs("div", { className: "todo-row", onPointerDown: editable ? dnd.start(t.id) : undefined, onContextMenu: (e) => editable && e.preventDefault(), children: [_jsx("button", { className: "check", style: c, disabled: !editable, onClick: tap(() => updateTodo(t.id, { done: !t.done })), "aria-label": t.done ? '완료 취소' : '완료', children: t.done && _jsx(CheckMarkIcon, {}) }), _jsxs("span", { className: "todo-title", onClick: tap(() => onOpenTodo?.(t.id)), children: [t.time && _jsx("span", { className: "todo-time", children: timeLabel(t.time) }), _jsx("span", { className: "todo-text", children: t.title }), t.routine_id && (_jsxs("span", { className: "todo-repeat", title: "\uBC18\uBCF5", children: [_jsx(RepeatIcon, {}), repeatDays.get(t.routine_id) && _jsx("span", { children: shortRepeat(repeatDays.get(t.routine_id)) })] })), t.focus_seconds > 0 && (_jsxs("span", { className: "tomato", children: [' ', _jsx(TomatoIcon, {}), " ", formatDuration(t.focus_seconds)] }))] }), editable && (_jsx("button", { className: "more", onClick: tap(() => onOpenTodo?.(t.id)), "aria-label": "\uB354\uBCF4\uAE30", children: _jsx(MoreIcon, {}) }))] }), t.done && _jsx(ReactionBar, { list: reactions?.get(t.id) ?? [], myId: myId, onPick: onReact && ((e) => onReact(t.id, e)) })] }, t.id))), adding && (_jsx("li", { className: "todo", children: _jsxs("div", { className: "todo-row", style: c, children: [_jsx("span", { className: "check" }), _jsx(NewTodoInput, { onSubmit: adding, onDone: onAddDone })] }) }))] }));
}
function NewTodoInput({ onSubmit, onDone }) {
    const [value, setValue] = useState('');
    const submit = () => {
        const title = value.trim();
        if (title)
            onSubmit(title);
        setValue('');
        return !!title;
    };
    return (_jsx("input", { className: "todo-input", autoFocus: true, enterKeyHint: "done", placeholder: "\uD560 \uC77C \uC785\uB825", value: value, onChange: (e) => setValue(e.target.value), onKeyDown: (e) => {
            if (e.nativeEvent.isComposing)
                return;
            if (e.key === 'Enter' && !submit())
                onDone();
            if (e.key === 'Escape')
                onDone();
        }, onBlur: () => {
            submit();
            onDone();
        } }));
}
