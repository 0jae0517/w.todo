import { useState } from 'react'
import { addDays, dayLabel, timeLabel, todayKey } from '../date'
import { deleteTodo, updateTodo } from '../store'
import { focusOn, formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import type { Category, Todo } from '../types'
import Sheet from './Sheet'
import TimeWheel from './TimeWheel'

interface Props {
  todo: Todo
  categories: Category[]
  reactions: Reaction[]
  onClose: () => void
  onFocus: () => void
}

export default function TodoSheet({ todo, categories, reactions, onClose, onFocus }: Props) {
  const [title, setTitle] = useState(todo.title)
  const [pickingTime, setPickingTime] = useState(false)
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
        {todo.focus_seconds > 0 && ` · 🍅 ${todo.pomodoros}회, 총 ${formatDuration(todo.focus_seconds)} 집중`}
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
          🍅 뽀모도로 시작
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
        <button className="time-btn" onClick={() => setPickingTime(!pickingTime)}>
          {todo.time ? timeLabel(todo.time) : '정하지 않음'}
        </button>
      </div>
      {pickingTime && (
        <TimeWheel
          value={todo.time}
          onDone={(time) => {
            updateTodo(todo.id, { time })
            setPickingTime(false)
          }}
          onClear={() => {
            updateTodo(todo.id, { time: null })
            setPickingTime(false)
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
