import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { STATUS_LABEL } from './components/Account';
import Calendar from './components/Calendar';
import CategorySheet from './components/CategorySheet';
import DayList from './components/DayList';
import FriendStrip from './components/FriendStrip';
import FriendView from './components/FriendView';
import Friends from './components/Friends';
import { CheckIcon, CloudIcon, FriendsIcon, PersonIcon, PlusIcon, TableIcon, TimerIcon } from './components/Icons';
import Mascot, { ChalkFilter } from './components/Mascot';
import Me from './components/Me';
import Pomodoro from './components/Pomodoro';
import { TemplateView } from './components/Templates';
import Timetable, { CourseSheet, DayClasses } from './components/Timetable';
import TodoSheet from './components/TodoSheet';
import { dayLabel, todayKey } from './date';
import { holidayName } from './holidays';
import { startNative } from './native';
import { useOfficePresence } from './office';
import { useMyReactions } from './social';
import { useStore } from './store';
import { currentUserId, useSync } from './sync';
import { useTimetableOn } from './timetable';
const TITLES = { todos: 'w.todo', timetable: '시간표', timer: '뽀모도로', friends: '친구', me: '내 정보' };
export default function App() {
    const { categories, todos, courses } = useStore();
    // 시간표 is for university students: shown once turned on, or once there are classes
    const showTimetable = useTimetableOn() || courses.length > 0;
    const { status } = useSync();
    const [tab, setTab] = useState('todos');
    const [selected, setSelected] = useState(todayKey);
    const [mode, setMode] = useState('month');
    const [panel, setPanel] = useState(null);
    const [friend, setFriend] = useState(null);
    // a shared template link: ?t=<id>
    const [templateId, setTemplateId] = useState(() => {
        const id = new URLSearchParams(location.search).get('t');
        if (id)
            history.replaceState(null, '', location.pathname);
        return id;
    });
    useEffect(() => startNative(setTemplateId), []);
    useOfficePresence();
    const stats = useMemo(() => {
        const m = new Map();
        for (const t of todos) {
            const s = m.get(t.date) ?? { total: 0, left: 0 };
            s.total++;
            if (!t.done)
                s.left++;
            m.set(t.date, s);
        }
        return m;
    }, [todos]);
    const dayTodos = todos.filter((t) => t.date === selected);
    const reactions = useMyReactions(dayTodos.filter((t) => t.done).map((t) => t.id));
    const openTodo = panel?.kind === 'todo' ? todos.find((t) => t.id === panel.id) : undefined;
    return (_jsxs("div", { className: "app", children: [_jsx(ChalkFilter, {}), _jsxs("header", { className: "top", children: [_jsx("h1", { children: TITLES[tab] }), _jsxs("div", { className: "top-actions", children: [tab === 'todos' && !friend && (_jsx("button", { className: "icon-btn", onClick: () => setPanel({ kind: 'categories' }), "aria-label": "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", title: "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", children: _jsx(PlusIcon, {}) })), _jsxs("button", { className: "icon-btn sync-btn", onClick: () => setTab('me'), "aria-label": STATUS_LABEL[status], title: STATUS_LABEL[status], children: [_jsx(CloudIcon, {}), _jsx("span", { className: `dot s-${status}` })] })] })] }), tab === 'todos' && _jsx(FriendStrip, { selected: friend, onSelect: setFriend, onFind: () => setTab('friends') }), tab === 'todos' && friend && (_jsx("main", { children: _jsx(FriendView, { friend: friend }, friend.id) })), tab === 'todos' && !friend && (_jsxs(_Fragment, { children: [_jsx(Calendar, { selected: selected, onSelect: setSelected, mode: mode, onModeChange: setMode, stats: stats }), _jsxs("main", { children: [_jsxs("h2", { className: "day-title", children: [dayLabel(selected), holidayName(selected) && _jsxs("span", { className: "holiday", children: [" \u00B7 ", holidayName(selected)] })] }), _jsx(DayClasses, { date: selected, onOpen: (c) => setPanel({ kind: 'course', id: c.id }) }), _jsx(DayList, { date: selected, categories: categories, todos: dayTodos, reactions: reactions, myId: currentUserId(), onOpenTodo: (id) => setPanel({ kind: 'todo', id }) }), _jsx(DayMascot, { todos: dayTodos, isToday: selected === todayKey() })] })] })), tab === 'timetable' && _jsx(Timetable, {}), tab === 'timer' && _jsx(Pomodoro, { todos: todos }), tab === 'friends' && _jsx(Friends, { onLogin: () => setTab('me') }), tab === 'me' && _jsx(Me, { todos: todos, categories: categories }), _jsxs("nav", { className: "tabbar", children: [_jsxs("button", { className: tab === 'todos' ? 'on' : '', onClick: () => setTab('todos'), children: [_jsx(CheckIcon, {}), "\uD560 \uC77C"] }), showTimetable && (_jsxs("button", { className: tab === 'timetable' ? 'on' : '', onClick: () => setTab('timetable'), children: [_jsx(TableIcon, {}), "\uC2DC\uAC04\uD45C"] })), _jsxs("button", { className: tab === 'timer' ? 'on' : '', onClick: () => setTab('timer'), children: [_jsx(TimerIcon, {}), "\uD0C0\uC774\uBA38"] }), _jsxs("button", { className: tab === 'friends' ? 'on' : '', onClick: () => setTab('friends'), children: [_jsx(FriendsIcon, {}), "\uCE5C\uAD6C"] }), _jsxs("button", { className: tab === 'me' ? 'on' : '', onClick: () => setTab('me'), children: [_jsx(PersonIcon, {}), "\uB0B4 \uC815\uBCF4"] })] }), openTodo && (_jsx(TodoSheet, { todo: openTodo, categories: categories, reactions: reactions.get(openTodo.id) ?? [], onClose: () => setPanel(null), onFocus: () => {
                    setPanel(null);
                    setTab('timer');
                } }, openTodo.id)), templateId && _jsx(TemplateView, { id: templateId, onClose: () => setTemplateId(null) }), panel?.kind === 'course' && courses.some((c) => c.id === panel.id) && (_jsx(CourseSheet, { course: courses.find((c) => c.id === panel.id), onClose: () => setPanel(null) })), panel?.kind === 'categories' && _jsx(CategorySheet, { categories: categories, onClose: () => setPanel(null) })] }));
}
/** 토도 under the day's list, cheering on what's left. */
function DayMascot({ todos, isToday }) {
    const left = todos.filter((t) => !t.done).length;
    const [mood, text] = !todos.length
        ? ['sleep', isToday ? '오늘은 할 일이 없어요' : '이 날은 할 일이 없어요']
        : !left
            ? ['happy', isToday ? '오늘 할 일 끝! 최고야' : '다 끝냈어!']
            : ['base', `${left}개 남았어!`];
    return (_jsxs("div", { className: "day-mascot", children: [_jsx("span", { className: "speech", children: text }), _jsx(Mascot, { mood: mood, size: 84 })] }));
}
