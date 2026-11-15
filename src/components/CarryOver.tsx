import { useState } from 'react'
import { addDays, dayLabel, todayKey } from '../date'
import { updateTodo } from '../store'
import type { Category, Todo } from '../types'
import { toast } from '../dialogs'
import Sheet from './Sheet'

const HIDE_KEY = 'todo-app:carry-hidden'
const LOOK_BACK = 30

/**
 * "지난 할 일 가져오기": undone todos from the last 30 days, shown on today's
 * list so they can be moved to today. Repeat copies are left out (the next
 * one comes anyway). Hiding it lasts until tomorrow.
 */
export default function CarryOver({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const today = todayKey()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === today
    } catch {
      return false
    }
  })
  const [open, setOpen] = useState(false)
  const from = addDays(today, -LOOK_BACK)
  const left = todos
    .filter((t) => !t.done && !t.routine_id && t.date < today && t.date >= from)
    .sort((a, b) => b.date.localeCompare(a.date) || a.position - b.position)
  if (!left.length || hidden) return null

  const names = new Map(categories.map((c) => [c.id, c.name]))
  const bring = (list: Todo[]) => {
    const before = list.map((t) => [t.id, t.date] as const)
    for (const t of list) updateTodo(t.id, { date: today })
    toast(`${list.length}개를 오늘로 가져왔어요`, {
      label: '되돌리기',
      run: () => before.forEach(([id, date]) => updateTodo(id, { date })),
    })
  }

  return (
    <>
      <div className="carry-row">
        <button className="carry-open" onClick={() => setOpen(true)}>
          못 끝낸 지난 할 일 <b>{left.length}개</b>
        </button>
        <button className="link" onClick={() => bring(left)}>
          모두 오늘로
        </button>
        <button
          className="link muted"
          onClick={() => {
            setHidden(true)
            try {
              localStorage.setItem(HIDE_KEY, today)
            } catch {
              // ignore
            }
          }}
        >
          숨기기
        </button>
      </div>
      {open && (
        <Sheet title="지난 할 일 가져오기" onClose={() => setOpen(false)}>
          <p className="sheet-sub">최근 {LOOK_BACK}일 동안 끝내지 못한 할 일이에요. 반복 할 일은 빠져 있어요.</p>
          <ul className="carry-list">
            {left.map((t) => (
              <li key={t.id}>
                <span>
                  <small className="muted">
                    {dayLabel(t.date)} · {names.get(t.category_id) ?? ''}
                  </small>
                  {t.title}
                </span>
                <button className="link" onClick={() => bring([t])}>
                  오늘로
                </button>
              </li>
            ))}
          </ul>
          <button
            className="primary wide"
            onClick={() => {
              bring(left)
              setOpen(false)
            }}
          >
            모두 오늘로 가져오기
          </button>
        </Sheet>
      )}
    </>
  )
}
