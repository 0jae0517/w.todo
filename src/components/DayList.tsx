import { useState } from 'react'
import { timeLabel } from '../date'
import { formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import { addTodo, reorderCategories, updateTodo } from '../store'
import type { Category, Todo } from '../types'
import ReactionBar from './ReactionBar'
import { useDragSort } from './useDragSort'

interface Props {
  date: string
  categories: Category[]
  todos: Todo[]
  reactions?: Map<string, Reaction[]>
  myId?: string | null
  /** own list: open the edit sheet; omitted for a friend's list (read-only) */
  onOpenTodo?: (id: string) => void
  /** friend's list: react to a finished todo */
  onReact?: (todoId: string, emoji: string | null) => void
}

const ORPHAN: Category = { id: '', name: '카테고리 없음', color: '#8a8f98', visibility: 'followers', allowed_ids: [], private: false, position: 0, deleted: false, updated_at: '' }

export default function DayList({ date, categories, todos, reactions, myId, onOpenTodo, onReact }: Props) {
  const [adding, setAdding] = useState<string | null>(null)
  const editable = !!onOpenTodo
  const known = new Set(categories.map((c) => c.id))
  const orphans = todos.filter((t) => !known.has(t.category_id))
  const groups = (orphans.length ? [...categories, ORPHAN] : categories).filter(
    (c) => editable || todos.some((t) => t.category_id === c.id),
  )
  const sortable = editable ? categories.map((c) => c.id) : []
  const dnd = useDragSort(sortable, reorderCategories)

  if (!groups.length) {
    return (
      <p className="empty">
        {editable ? '카테고리를 먼저 만들어 주세요. 오른쪽 위 + 버튼에서 추가할 수 있어요.' : '이 날은 공개된 할 일이 없어요.'}
      </p>
    )
  }

  return (
    <div className="day-list">
      {groups.map((cat) => {
        const items = (cat === ORPHAN ? orphans : todos.filter((t) => t.category_id === cat.id)).sort(byTime)
        const c = { '--c': cat.color } as React.CSSProperties
        return (
          <section
            key={cat.id || 'orphan'}
            ref={editable && cat !== ORPHAN ? dnd.register(cat.id) : undefined}
            className={`group ${dnd.dragging === cat.id ? 'dragging' : ''}`}
            style={dnd.styleFor(cat.id)}
          >
            <button
              className="group-head"
              style={c}
              disabled={!editable || cat === ORPHAN}
              onPointerDown={editable && cat !== ORPHAN ? dnd.start(cat.id) : undefined}
              onContextMenu={(e) => editable && e.preventDefault()}
              onClick={() => !dnd.justDragged.current && setAdding(adding === cat.id ? null : cat.id)}
            >
              <span className="group-name">{cat.name}</span>
              {cat.visibility === 'private' && <span className="lock" title="나만 보기">🔒</span>}
              {cat.visibility === 'selected' && <span className="lock" title="일부 공개">👤</span>}
              {editable && cat !== ORPHAN && <span className="group-add">+</span>}
            </button>
            <ul>
              {items.map((t) => (
                <li key={t.id} className={`todo ${t.done ? 'done' : ''}`}>
                  <div className="todo-row">
                    <button
                      className="check"
                      style={c}
                      disabled={!editable}
                      onClick={() => updateTodo(t.id, { done: !t.done })}
                      aria-label={t.done ? '완료 취소' : '완료'}
                    >
                      {t.done && '✓'}
                    </button>
                    <span className="todo-title" onClick={() => onOpenTodo?.(t.id)}>
                      {t.time && <span className="todo-time">{timeLabel(t.time)}</span>}
                      {t.routine_id && <span className="todo-repeat" title="반복">🔁</span>}
                      {t.title}
                      {t.focus_seconds > 0 && <span className="tomato"> 🍅 {formatDuration(t.focus_seconds)}</span>}
                    </span>
                    {editable && (
                      <button className="more" onClick={() => onOpenTodo(t.id)} aria-label="더보기">⋯</button>
                    )}
                  </div>
                  {t.done && (
                    <ReactionBar
                      list={reactions?.get(t.id) ?? []}
                      myId={myId}
                      onPick={onReact && ((e) => onReact(t.id, e))}
                    />
                  )}
                </li>
              ))}
              {adding === cat.id && (
                <li className="todo">
                  <div className="todo-row">
                    <span className="check" style={c} />
                    <NewTodoInput onSubmit={(title) => addTodo(title, date, cat.id)} onDone={() => setAdding(null)} />
                  </div>
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** timed todos first, in time order; the rest keep their manual order */
function byTime(a: Todo, b: Todo) {
  if (a.time && b.time) return a.time.localeCompare(b.time) || a.position - b.position
  if (a.time || b.time) return a.time ? -1 : 1
  return a.position - b.position
}

function NewTodoInput({ onSubmit, onDone }: { onSubmit: (title: string) => void; onDone: () => void }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const title = value.trim()
    if (title) onSubmit(title)
    setValue('')
    return !!title
  }
  return (
    <input
      className="todo-input"
      autoFocus
      enterKeyHint="done"
      placeholder="할 일 입력"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter' && !submit()) onDone()
        if (e.key === 'Escape') onDone()
      }}
      onBlur={() => {
        submit()
        onDone()
      }}
    />
  )
}
