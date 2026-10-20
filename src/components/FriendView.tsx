import { useEffect, useMemo, useState } from 'react'
import { addDays, dayLabel, monthGrid, todayKey } from '../date'
import { holidayName } from '../holidays'
import { byTodo, followingIds, follow, friendData, react, reactionsFor, unfollow, unreact, type FollowState, type Profile, type Reaction } from '../social'
import { currentUserId } from '../sync'
import type { Category, Todo } from '../types'
import Calendar, { type DayStat } from './Calendar'
import DayList from './DayList'
import Heatmap from './Heatmap'

export const FOLLOW_LABEL = { following: '팔로잉', requested: '요청됨', none: '팔로우' }

/** A friend's calendar and todos. Without `onBack` it's shown inline (from the strip on the todo tab). */
export default function FriendView({ friend, onBack }: { friend: Profile; onBack?: () => void }) {
  const [selected, setSelected] = useState(todayKey)
  const [mode, setMode] = useState<'week' | 'month'>(onBack ? 'week' : 'month')
  const [data, setData] = useState<{ categories: Category[]; todos: Todo[] }>({ categories: [], todos: [] })
  const [reactions, setReactions] = useState<Reaction[]>([])
  // undefined while loading, null when not following
  const [state, setState] = useState<FollowState | null | undefined>(undefined)
  const isFollowing = state === 'following'
  const [err, setErr] = useState<string | null>(null)
  const myId = currentUserId()

  // load the whole month around the selected day
  const grid = monthGrid(selected)
  const from = grid[0]
  const to = grid[grid.length - 1]

  useEffect(() => {
    followingIds().then((m) => setState(m.get(friend.id) ?? null)).catch(() => {})
  }, [friend.id])

  useEffect(() => {
    if (!isFollowing) return
    let alive = true
    friendData(friend.id, from, to)
      .then((d) => alive && setData(d))
      .catch((e) => setErr(e.message))
    return () => {
      alive = false
    }
  }, [friend.id, from, to, isFollowing])

  // a year of todos for the grass grid
  const [year, setYear] = useState<Todo[]>([])
  useEffect(() => {
    if (!isFollowing) return setYear([])
    const today = todayKey()
    friendData(friend.id, addDays(today, -7 * 53), today)
      .then((d) => setYear(d.todos))
      .catch(() => {})
  }, [friend.id, isFollowing])

  const dayTodos = data.todos.filter((t) => t.date === selected)
  const doneIds = dayTodos.filter((t) => t.done).map((t) => t.id).join(',')
  useEffect(() => {
    if (!doneIds) return setReactions([])
    reactionsFor(friend.id, doneIds.split(',')).then(setReactions).catch(() => {})
  }, [friend.id, doneIds])

  const stats = useMemo(() => {
    const m = new Map<string, DayStat>()
    for (const t of data.todos) {
      const s = m.get(t.date) ?? { total: 0, left: 0 }
      s.total++
      if (!t.done) s.left++
      m.set(t.date, s)
    }
    return m
  }, [data.todos])

  const onReact = async (todoId: string, emoji: string | null) => {
    const before = reactions
    const rest = reactions.filter((r) => !(r.todo_id === todoId && r.user_id === myId))
    setReactions(emoji ? [...rest, { owner_id: friend.id, todo_id: todoId, user_id: myId!, emoji, profile: null }] : rest)
    try {
      await (emoji ? react(friend.id, todoId, emoji) : unreact(friend.id, todoId))
    } catch (e) {
      setReactions(before)
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const toggleFollow = async () => {
    try {
      if (state) {
        await unfollow(friend.id)
        setState(null)
        setData({ categories: [], todos: [] })
      } else {
        await follow(friend.id)
        setState('requested')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="friend-view">
      <div className="friend-head">
        {onBack && <button className="icon-btn" onClick={onBack} aria-label="뒤로">‹</button>}
        <div className="friend-name">
          <strong>{friend.name || friend.username}</strong>
          <span className="handle">@{friend.username}</span>
        </div>
        {state !== undefined && (
          <button className={state ? 'follow on' : 'follow'} onClick={toggleFollow}>
            {FOLLOW_LABEL[state ?? 'none']}
          </button>
        )}
      </div>
      {err && <p className="error">{err}</p>}
      {state === 'requested' ? (
        <p className="empty">팔로우를 요청했어요. 상대가 수락하면 할 일을 볼 수 있어요.</p>
      ) : state === null ? (
        <p className="empty">팔로우를 요청하고 상대가 수락하면 할 일을 보고 감정표현을 남길 수 있어요.</p>
      ) : (
        <>
          <Calendar selected={selected} onSelect={setSelected} mode={mode} onModeChange={setMode} stats={stats} />
          <h2 className="day-title">
            {dayLabel(selected)}
            {holidayName(selected) && <span className="holiday"> · {holidayName(selected)}</span>}
          </h2>
          <DayList
            date={selected}
            categories={data.categories}
            todos={dayTodos}
            reactions={byTodo(reactions)}
            myId={myId}
            onReact={onReact}
          />
          {year.length > 0 && (
            <section className="card friend-heat">
              <h3 className="sub-title">최근 1년</h3>
              <Heatmap todos={year} categories={data.categories} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
