import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { addDays, dayLabel, monthGrid, todayKey } from '../date';
import { holidayName } from '../holidays';
import { byTodo, followingIds, follow, friendData, react, reactionsFor, unfollow, unreact } from '../social';
import { currentUserId } from '../sync';
import Calendar from './Calendar';
import DayList from './DayList';
import Heatmap from './Heatmap';
import { ChevronLeftIcon } from './Icons';
export const FOLLOW_LABEL = { following: '팔로잉', requested: '요청됨', none: '팔로우' };
/** A friend's calendar and todos. Without `onBack` it's shown inline (from the strip on the todo tab). */
export default function FriendView({ friend, onBack }) {
    const [selected, setSelected] = useState(todayKey);
    const [mode, setMode] = useState(onBack ? 'week' : 'month');
    const [data, setData] = useState({ categories: [], todos: [] });
    const [reactions, setReactions] = useState([]);
    // undefined while loading, null when not following
    const [state, setState] = useState(undefined);
    const isFollowing = state === 'following';
    const [err, setErr] = useState(null);
    const myId = currentUserId();
    // load the whole month around the selected day
    const grid = monthGrid(selected);
    const from = grid[0];
    const to = grid[grid.length - 1];
    useEffect(() => {
        followingIds().then((m) => setState(m.get(friend.id) ?? null)).catch(() => { });
    }, [friend.id]);
    useEffect(() => {
        if (!isFollowing)
            return;
        let alive = true;
        friendData(friend.id, from, to)
            .then((d) => alive && setData(d))
            .catch((e) => setErr(e.message));
        return () => {
            alive = false;
        };
    }, [friend.id, from, to, isFollowing]);
    // a year of todos for the grass grid
    const [year, setYear] = useState([]);
    useEffect(() => {
        if (!isFollowing)
            return setYear([]);
        const today = todayKey();
        friendData(friend.id, addDays(today, -7 * 53), today)
            .then((d) => setYear(d.todos))
            .catch(() => { });
    }, [friend.id, isFollowing]);
    const dayTodos = data.todos.filter((t) => t.date === selected);
    const doneIds = dayTodos.filter((t) => t.done).map((t) => t.id).join(',');
    useEffect(() => {
        if (!doneIds)
            return setReactions([]);
        reactionsFor(friend.id, doneIds.split(',')).then(setReactions).catch(() => { });
    }, [friend.id, doneIds]);
    const stats = useMemo(() => {
        const m = new Map();
        for (const t of data.todos) {
            const s = m.get(t.date) ?? { total: 0, left: 0 };
            s.total++;
            if (!t.done)
                s.left++;
            m.set(t.date, s);
        }
        return m;
    }, [data.todos]);
    const onReact = async (todoId, emoji) => {
        const before = reactions;
        const rest = reactions.filter((r) => !(r.todo_id === todoId && r.user_id === myId));
        setReactions(emoji ? [...rest, { owner_id: friend.id, todo_id: todoId, user_id: myId, emoji, profile: null }] : rest);
        try {
            await (emoji ? react(friend.id, todoId, emoji) : unreact(friend.id, todoId));
        }
        catch (e) {
            setReactions(before);
            setErr(e instanceof Error ? e.message : String(e));
        }
    };
    const toggleFollow = async () => {
        try {
            if (state) {
                await unfollow(friend.id);
                setState(null);
                setData({ categories: [], todos: [] });
            }
            else {
                await follow(friend.id);
                setState('requested');
            }
        }
        catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        }
    };
    return (_jsxs("div", { className: "friend-view", children: [_jsxs("div", { className: "friend-head", children: [onBack && _jsx("button", { className: "icon-btn", onClick: onBack, "aria-label": "\uB4A4\uB85C", children: _jsx(ChevronLeftIcon, {}) }), _jsxs("div", { className: "friend-name", children: [_jsx("strong", { children: friend.name || friend.username }), _jsxs("span", { className: "handle", children: ["@", friend.username] })] }), state !== undefined && (_jsx("button", { className: state ? 'follow on' : 'follow', onClick: toggleFollow, children: FOLLOW_LABEL[state ?? 'none'] }))] }), err && _jsx("p", { className: "error", children: err }), state === 'requested' ? (_jsx("p", { className: "empty", children: "\uD314\uB85C\uC6B0\uB97C \uC694\uCCAD\uD588\uC5B4\uC694. \uC0C1\uB300\uAC00 \uC218\uB77D\uD558\uBA74 \uD560 \uC77C\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694." })) : state === null ? (_jsx("p", { className: "empty", children: "\uD314\uB85C\uC6B0\uB97C \uC694\uCCAD\uD558\uACE0 \uC0C1\uB300\uAC00 \uC218\uB77D\uD558\uBA74 \uD560 \uC77C\uC744 \uBCF4\uACE0 \uAC10\uC815\uD45C\uD604\uC744 \uB0A8\uAE38 \uC218 \uC788\uC5B4\uC694." })) : (_jsxs(_Fragment, { children: [_jsx(Calendar, { selected: selected, onSelect: setSelected, mode: mode, onModeChange: setMode, stats: stats }), _jsxs("h2", { className: "day-title", children: [dayLabel(selected), holidayName(selected) && _jsxs("span", { className: "holiday", children: [" \u00B7 ", holidayName(selected)] })] }), _jsx(DayList, { date: selected, categories: data.categories, todos: dayTodos, reactions: byTodo(reactions), myId: myId, onReact: onReact }), year.length > 0 && (_jsxs("section", { className: "card friend-heat", children: [_jsx("h3", { className: "sub-title", children: "\uC794\uB514" }), _jsx(Heatmap, { todos: year, categories: data.categories })] }))] }))] }));
}
