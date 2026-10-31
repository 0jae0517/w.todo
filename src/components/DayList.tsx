import { useState } from 'react'
import { timeLabel } from '../date'
import { formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import { addTodo, reorderCategories, reorderTodos, updateTodo, useStore } from '../store'
import type { Category, Todo } from '../types'
import { HandCircleIcon, HandTriangleIcon, LockIcon, PersonIcon, PlusIcon, RepeatIcon, TomatoIcon } from './Icons'
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

/** rows the sheet is padded to, so a short day still looks like a planner page */
const MIN_ROWS = 10

export default function DayList({ date, categories, todos, reactions, myId, onOpenTodo, onReact }: Props) {
  const [adding, setAdding] = useState<string | null>(null)
  const editable = !!onOpenTodo
  const known = new Set(categories.map((c) => c.id))
  const orphans = todos.filter((t) => !known.has(t.category_id))
  const groups = (orphans.length ? [...categories, ORPHAN] : categories).filter((c) => editable || todos.some((t) => t.category_id === c.id))
  const sortable = editable ? categories.map((c) => c.id) : []
  const dnd = useDragSort(sortable, reorderCategories)

  if (!groups.length) {
    return <p className="empty">{editable ? '카테고리를 먼저 만들어 주세요. 오른쪽 위 + 버튼에서 추가할 수 있어요.' : '이 날은 공개된 할 일이 없어요.'}</p>
  }

  const itemsOf = (cat: Category) => (cat === ORPHAN ? orphans : todos.filter((t) => t.category_id === cat.id)).sort(byPosition)
  // every category takes at least one row (an empty one invites a first todo)
  const used = groups.reduce((n, cat) => n + Math.max(1, itemsOf(cat).length + (adding === cat.id ? 1 : 0)), 0)

  return (
    <div className="planner">
      <div className="planner-head">TASKS</div>
      <div className="planner-sheet">
        {groups.map((cat) => {
          const items = itemsOf(cat)
          const c = { '--c': cat.color } as React.CSSProperties
          const canAdd = editable && cat !== ORPHAN
          const openAdd = () => {
            if (dnd.justDragged.current) return
            setAdding(adding === cat.id ? null : cat.id)
          }
          return (
            <section
              key={cat.id || 'orphan'}
              ref={canAdd ? dnd.register(cat.id) : undefined}
              className={`p-group ${dnd.dragging === cat.id ? 'dragging' : ''}`}
              style={{ ...c, ...dnd.styleFor(cat.id) }}
            >
              <div className="p-label">
                <button
                  className="p-cat"
                  disabled={!canAdd}
                  onPointerDown={canAdd ? dnd.start(cat.id) : undefined}
                  onContextMenu={(e) => editable && e.preventDefault()}
                  onClick={openAdd}
                >
                  <span className="p-cat-name">{cat.name}</span>
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
                </button>
              </div>
              <TodoItems
                items={items}
                color={c}
                editable={editable}
                reactions={reactions}
                myId={myId}
                onOpenTodo={onOpenTodo}
                onReact={onReact}
                onAddClick={canAdd ? openAdd : undefined}
                adding={adding === cat.id ? (title) => addTodo(title, date, cat.id) : null}
                onAddDone={() => setAdding(null)}
              />
            </section>
          )
        })}
        {Array.from({ length: Math.max(0, MIN_ROWS - used) }, (_, i) => (
          <div key={i} className="p-group p-filler" aria-hidden="true">
            <div className="p-label" />
            <div className="p-row">
              <div className="p-task" />
              <div className="p-status" />
            </div>
          </div>
        ))}
      </div>
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
  /** tapping the empty row of a category with no todos yet */
  onAddClick?: () => void
  /** set while the new-todo input is open in this category */
  adding: ((title: string) => void) | null
  onAddDone: () => void
}

/** One category's rows on the sheet; in my own list they can be dragged into a new order. */
function TodoItems({ items, color: c, editable, reactions, myId, onOpenTodo, onReact, onAddClick, adding, onAddDone }: ItemsProps) {
  const dnd = useDragSort(editable ? items.map((t) => t.id) : [], reorderTodos)
  // my own routines; a friend's list shows just the icon
  const { routines } = useStore()
  const repeatDays = new Map(editable ? routines.map((r) => [r.id, r.days] as const) : [])
  // a tap that ends a drag shouldn't also tick or open the todo
  const tap = (fn: () => void) => () => !dnd.justDragged.current && fn()
  return (
    <ul className="p-rows">
      {items.map((t) => {
        const started = !t.done && t.focus_seconds > 0
        return (
          <li
            key={t.id}
            ref={editable ? dnd.register(t.id) : undefined}
            className={`todo p-row ${t.done ? 'done' : ''} ${dnd.dragging === t.id ? 'dragging' : ''}`}
            style={dnd.styleFor(t.id)}
          >
            <div className="p-task" onPointerDown={editable ? dnd.start(t.id) : undefined} onContextMenu={(e) => editable && e.preventDefault()}>
              <span className="p-hl todo-title" style={c} onClick={tap(() => onOpenTodo?.(t.id))}>
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
              {t.done && <ReactionBar list={reactions?.get(t.id) ?? []} myId={myId} onPick={onReact && ((e) => onReact(t.id, e))} />}
            </div>
            <button
              className="p-status"
              disabled={!editable}
              onClick={tap(() => updateTodo(t.id, { done: !t.done }))}
              aria-label={t.done ? '완료 취소' : '완료'}
              title={started ? '진행 중' : undefined}
            >
              {t.done ? <HandCircleIcon /> : started ? <HandTriangleIcon /> : null}
            </button>
          </li>
        )
      })}
      {adding && (
        <li className="todo p-row">
          <div className="p-task" style={c}>
            <NewTodoInput onSubmit={adding} onDone={onAddDone} />
          </div>
          <span className="p-status" />
        </li>
      )}
      {!items.length && !adding && (
        <li className="p-row">
          <button className="p-task p-empty" disabled={!onAddClick} onClick={onAddClick}>
            {onAddClick && (
              <>
                <PlusIcon /> 할 일 추가
              </>
            )}
          </button>
          <span className="p-status" />
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
