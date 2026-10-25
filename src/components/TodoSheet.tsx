import { useState } from 'react'
import { WEEKDAYS, addDays, dayLabel, fromKey, timeLabel, todayKey } from '../date'
import { deleteTodo, repeatStreak, setRepeat, stopRepeat, updateTodo, useStore } from '../store'
import { focusOn, formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import type { Category, Todo } from '../types'
import Sheet from './Sheet'
import TimeWheel from './TimeWheel'
import { TomatoIcon } from './Icons'

interface Props {
  todo: Todo
  categories: Category[]
  reactions: Reaction[]
  onClose: () => void
  onFocus: () => void
}

export default function TodoSheet({ todo, categories, reactions, onClose, onFocus }: Props) {
  const [title, setTitle] = useState(todo.title)
  const [picking, setPicking] = useState<'time' | 'repeat' | null>(null)
  const routine = useStore().routines.find((r) => r.id === todo.routine_id)
  const saveTitle = () => {
    const t = title.trim()
    if (t && t !== todo.title) updateTodo(todo.id, { title: t })
  }
  const close = () => {
    saveTitle()
    onClose()
  }
  const moveTo = (date: string) => {
    saveTitle()
    updateTodo(todo.id, { date })
    onClose()
  }
  const today = todayKey()

  return (
    <Sheet onClose={close}>
      <input
        className="sheet-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && close()}
      />
      <p className="sheet-sub">
        {dayLabel(todo.date)}
        {todo.focus_seconds > 0 && (
          <>
            {' · '}
            <TomatoIcon /> {todo.pomodoros}회, 총 {formatDuration(todo.focus_seconds)} 집중
          </>
        )}
        {routine && repeatStreak(routine.id) > 0 && ` · ${repeatStreak(routine.id)}일 연속 달성`}
      </p>
      {reactions.length > 0 && (
        <ul className="who-reacted">
          {reactions.map((r) => (
            <li key={r.user_id}>
              <span>{r.emoji}</span> {r.profile?.name || r.profile?.username}
              {r.profile?.name && <span className="handle"> @{r.profile.username}</span>}
            </li>
          ))}
        </ul>
      )}
      {!todo.done && (
        <button
          className="primary wide"
          onClick={() => {
            saveTitle()
            focusOn(todo.id)
            onFocus()
          }}
        >
          <TomatoIcon /> 뽀모도로 시작
        </button>
      )}
      <div className="actions">
        {todo.date !== today && <button onClick={() => moveTo(today)}>오늘 하기</button>}
        <button onClick={() => moveTo(addDays(todo.date, 1))}>내일 하기</button>
        <label className="action-date">
          날짜 바꾸기
          <input type="date" value={todo.date} onChange={(e) => e.target.value && moveTo(e.target.value)} />
        </label>
      </div>
      <div className="field">
        <span>시간</span>
        <button className="time-btn" onClick={() => setPicking(picking === 'time' ? null : 'time')}>
          {todo.time ? timeLabel(todo.time) : '정하지 않음'}
        </button>
      </div>
      {picking === 'time' && (
        <TimeWheel
          value={todo.time}
          onDone={(time) => {
            updateTodo(todo.id, { time })
            setPicking(null)
          }}
          onClear={() => {
            updateTodo(todo.id, { time: null })
            setPicking(null)
          }}
        />
      )}
      <div className="field">
        <span>반복</span>
        <button className="time-btn" onClick={() => setPicking(picking === 'repeat' ? null : 'repeat')}>
          {routine ? repeatLabel(routine.days) : '반복 안 함'}
        </button>
      </div>
      {picking === 'repeat' && (
        <RepeatPicker
          value={routine?.days ?? [fromKey(todo.date).getDay()]}
          repeating={!!routine}
          onDone={(days) => {
            saveTitle()
            setRepeat(todo.id, days)
            setPicking(null)
          }}
          onStop={() => {
            stopRepeat(todo.id)
            setPicking(null)
          }}
        />
      )}
      <label className="field">
        <span>카테고리</span>
        <select value={todo.category_id} onChange={(e) => updateTodo(todo.id, { category_id: e.target.value })}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <button
        className="danger"
        onClick={() => {
          deleteTodo(todo.id)
          onClose()
        }}
      >
        삭제
      </button>
    </Sheet>
  )
}

const PRESETS: [string, number[]][] = [
  ['매일', [0, 1, 2, 3, 4, 5, 6]],
  ['평일', [1, 2, 3, 4, 5]],
  ['주말', [0, 6]],
]

/** "매일", "평일", "월·수·금" */
export function repeatLabel(days: number[]) {
  const sorted = [...days].sort()
  const preset = PRESETS.find(([, d]) => d.join() === sorted.join())
  if (preset) return preset[0]
  // Monday-first reads more naturally
  return [...sorted.filter((d) => d > 0), ...sorted.filter((d) => d === 0)].map((d) => WEEKDAYS[d]).join('·') + (days.length === 1 ? '요일마다' : '')
}

function RepeatPicker({ value, repeating, onDone, onStop }: { value: number[]; repeating: boolean; onDone: (days: number[]) => void; onStop: () => void }) {
  const [days, setDays] = useState(value)
  const toggle = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])
  return (
    <div className="repeat-box">
      <div className="repeat-presets">
        {PRESETS.map(([label, d]) => (
          <button key={label} className={[...days].sort().join() === d.join() ? 'on' : ''} onClick={() => setDays(d)}>
            {label}
          </button>
        ))}
      </div>
      <div className="repeat-days">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} className={`${days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`} onClick={() => toggle(d)}>
            {WEEKDAYS[d]}
          </button>
        ))}
      </div>
      <div className="actions">
        {repeating && <button onClick={onStop}>반복 끄기</button>}
        <button className="primary" disabled={!days.length} onClick={() => onDone(days)}>
          확인
        </button>
      </div>
    </div>
  )
}
