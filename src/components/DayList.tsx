import { useState } from 'react'
import { timeLabel } from '../date'
import { formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import { addTodo, reorderCategories, reorderTodos, updateTodo, useStore } from '../store'
import type { Category, Todo } from '../types'
import { CheckMarkIcon, LockIcon, MoreIcon, PersonIcon, PlusIcon, RepeatIcon, TomatoIcon } from './Icons'
import ReactionBar from './ReactionBar'
import { repeatLabel } from './TodoSheet'
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

const FOLD_KEY = 'todo-app:folded'

/** Folded category ids. Own list remembers them on this device; a friend's list only for the visit. */
function useFolded(persist: boolean) {
  const [folded, setFolded] = useState<Set<string>>(() => {
    if (!persist) return new Set()
    try {
      return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]'))
    } catch {
      return new Set()
    }
  })
  const toggle = (id: string, fold = !folded.has(id)) => {
    const next = new Set(folded)
    if (fold) next.add(id)
    else next.delete(id)
    setFolded(next)
    if (persist)
      try {
        localStorage.setItem(FOLD_KEY, JSON.stringify([...next]))
      } catch {
        // not remembered, that's fine
      }
  }
  return { folded, toggle }
}

const ORPHAN: Category = {
  id: '',
  name: '카테고리 없음',
  color: '#8a8f98',
  visibility: 'followers',
  allowed_ids: [],
  private: false,
  position: 0,
  deleted: false,
  updated_at: '',
}

export default function DayList({ date, categories, todos, reactions, myId, onOpenTodo, onReact }: Props) {
  const [adding, setAdding] = useState<string | null>(null)
  const editable = !!onOpenTodo
  const known = new Set(categories.map((c) => c.id))
  const orphans = todos.filter((t) => !known.has(t.category_id))
  const groups = (orphans.length ? [...categories, ORPHAN] : categories).filter((c) => editable || todos.some((t) => t.category_id === c.id))
  const sortable = editable ? categories.map((c) => c.id) : []
  const dnd = useDragSort(sortable, reorderCategories)
  const { folded, toggle } = useFolded(editable)

  if (!groups.length) {
    return <p className="empty">{editable ? '카테고리를 먼저 만들어 주세요. 오른쪽 위 + 버튼에서 추가할 수 있어요.' : '이 날은 공개된 할 일이 없어요.'}</p>
  }

  return (
    <div className="day-list">
      {groups.map((cat) => {
        const items = (cat === ORPHAN ? orphans : todos.filter((t) => t.category_id === cat.id)).sort(byPosition)
        const c = { '--c': cat.color } as React.CSSProperties
        const key = cat.id || 'orphan'
        const isFolded = folded.has(key) && adding !== cat.id
        return (
          <section
            key={cat.id || 'orphan'}
            ref={editable && cat !== ORPHAN ? dnd.register(cat.id) : undefined}
            className={`group ${dnd.dragging === cat.id ? 'dragging' : ''}`}
            style={dnd.styleFor(cat.id)}
          >
            <div className="group-bar">
              <button
                className="group-head"
                style={c}
                disabled={!editable || cat === ORPHAN}
                onPointerDown={editable && cat !== ORPHAN ? dnd.start(cat.id) : undefined}
                onContextMenu={(e) => editable && e.preventDefault()}
                onClick={() => {
                  if (dnd.justDragged.current) return
                  if (adding !== cat.id) toggle(key, false)
                  setAdding(adding === cat.id ? null : cat.id)
                }}
              >
                <span className="group-name">{cat.name}</span>
                {cat.visibility === 'private' && (
                  <span className="lock" title="나만 보기">
                    <LockIcon />
                  </span>
                )}
                {cat.visibility === 'selected' && (
                  <span className="lock" title="일부 공개">
                    <PersonIcon />
                  </span>
                )}
                {editable && cat !== ORPHAN && (
                  <span className="group-add">
                    <PlusIcon />
                  </span>
                )}
              </button>
              {items.length > 0 && (
                <button className="fold" onClick={() => toggle(key)} aria-expanded={!isFolded} aria-label={isFolded ? '펼치기' : '접기'}>
                  {isFolded && (
                    <span className="fold-count">
                      {items.filter((t) => t.done).length}/{items.length}
                    </span>
                  )}
                  <svg className={`chev ${isFolded ? 'closed' : ''}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
            {!isFolded && (
              <TodoItems
                items={items}
                color={c}
                editable={editable}
                reactions={reactions}
                myId={myId}
                onOpenTodo={onOpenTodo}
                onReact={onReact}
                adding={adding === cat.id ? (title) => addTodo(title, date, cat.id) : null}
                onAddDone={() => setAdding(null)}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}

/** manual order (a todo given a time is first slotted in by time, see updateTodo) */
/** "매일", "평일", "월·수·금", "매주 월" */
function shortRepeat(days: number[]) {
  const label = repeatLabel(days)
  return label.endsWith('요일마다') ? `매주 ${label.replace('요일마다', '')}` : label
}

const byPosition = (a: Todo, b: Todo) => a.position - b.position || (a.time ?? '~').localeCompare(b.time ?? '~')

interface ItemsProps {
  items: Todo[]
  color: React.CSSProperties
  editable: boolean
  reactions?: Map<string, Reaction[]>
  myId?: string | null
  onOpenTodo?: (id: string) => void
  onReact?: (todoId: string, emoji: string | null) => void
  /** set while the new-todo input is open in this category */
  adding: ((title: string) => void) | null
  onAddDone: () => void
}

/** One category's todos; in my own list they can be dragged into a new order. */
function TodoItems({ items, color: c, editable, reactions, myId, onOpenTodo, onReact, adding, onAddDone }: ItemsProps) {
  const dnd = useDragSort(editable ? items.map((t) => t.id) : [], reorderTodos)
  // my own routines; a friend's list shows just the icon
  const { routines } = useStore()
  const repeatDays = new Map(editable ? routines.map((r) => [r.id, r.days] as const) : [])
  // a tap that ends a drag shouldn't also tick or open the todo
  const tap = (fn: () => void) => () => !dnd.justDragged.current && fn()
  return (
    <ul>
      {items.map((t) => (
        <li
          key={t.id}
          ref={editable ? dnd.register(t.id) : undefined}
          className={`todo ${t.done ? 'done' : ''} ${dnd.dragging === t.id ? 'dragging' : ''}`}
          style={dnd.styleFor(t.id)}
        >
          <div className="todo-row" onPointerDown={editable ? dnd.start(t.id) : undefined} onContextMenu={(e) => editable && e.preventDefault()}>
            <button
              className="check"
              style={c}
              disabled={!editable}
              onClick={tap(() => updateTodo(t.id, { done: !t.done }))}
              aria-label={t.done ? '완료 취소' : '완료'}
            >
              {t.done && <CheckMarkIcon />}
            </button>
            <span className="todo-title" onClick={tap(() => onOpenTodo?.(t.id))}>
              {t.time && <span className="todo-time">{timeLabel(t.time)}</span>}
              <span className="todo-text">{t.title}</span>
              {t.routine_id && (
                <span className="todo-repeat" title="반복">
                  <RepeatIcon />
                  {repeatDays.get(t.routine_id) && <span>{shortRepeat(repeatDays.get(t.routine_id)!)}</span>}
                </span>
              )}
              {t.focus_seconds > 0 && (
                <span className="tomato">
                  {' '}
                  <TomatoIcon /> {formatDuration(t.focus_seconds)}
                </span>
              )}
            </span>
            {editable && (
              <button className="more" onClick={tap(() => onOpenTodo?.(t.id))} aria-label="더보기">
                <MoreIcon />
              </button>
            )}
          </div>
          {t.done && <ReactionBar list={reactions?.get(t.id) ?? []} myId={myId} onPick={onReact && ((e) => onReact(t.id, e))} />}
        </li>
      ))}
      {adding && (
        <li className="todo">
          <div className="todo-row">
            <span className="check" style={c} />
            <NewTodoInput onSubmit={adding} onDone={onAddDone} />
          </div>
        </li>
      )}
    </ul>
  )
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
