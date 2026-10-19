import { useEffect, useMemo, useState } from 'react'
import { dayLabel, monthGrid, todayKey } from '../date'
import { byTodo, followingIds, follow, friendData, react, reactionsFor, unfollow, unreact, type Profile, type Reaction } from '../social'
import { currentUserId } from '../sync'
import type { Category, Todo } from '../types'
import Calendar, { type DayStat } from './Calendar'
import DayList from './DayList'

export default function FriendView({ friend, onBack }: { friend: Profile; onBack: () => void }) {
  const [selected, setSelected] = useState(todayKey)
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [data, setData] = useState<{ categories: Category[]; todos: Todo[] }>({ categories: [], todos: [] })
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const myId = currentUserId()

  // load the whole month around the selected day
  const grid = monthGrid(selected)
  const from = grid[0]
  const to = grid[grid.length - 1]

  useEffect(() => {
    followingIds().then((s) => setIsFollowing(s.has(friend.id))).catch(() => {})
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
      await (isFollowing ? unfollow(friend.id) : follow(friend.id))
      setIsFollowing(!isFollowing)
      if (isFollowing) setData({ categories: [], todos: [] })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="friend-view">
      <div className="friend-head">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">‹</button>
        <div className="friend-name">
          <strong>{friend.name || friend.username}</strong>
          <span className="handle">@{friend.username}</span>
        </div>
        {isFollowing !== null && (
          <button className={isFollowing ? 'follow on' : 'follow'} onClick={toggleFollow}>
            {isFollowing ? '팔로잉' : '팔로우'}
          </button>
        )}
      </div>
      {err && <p className="error">{err}</p>}
      {isFollowing === false ? (
        <p className="empty">팔로우하면 할 일을 보고 감정표현을 남길 수 있어요.</p>
      ) : (
        <>
          <Calendar selected={selected} onSelect={setSelected} mode={mode} onModeChange={setMode} stats={stats} />
          <h2 className="day-title">{dayLabel(selected)}</h2>
          <DayList
            date={selected}
            categories={data.categories}
            todos={dayTodos}
            reactions={byTodo(reactions)}
            myId={myId}
            onReact={onReact}
          />
        </>
      )}
    </div>
  )
}
