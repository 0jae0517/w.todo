import { useRef, useState } from 'react'
import { WEEKDAYS, addDays, dayLabel, fromKey, timeLabel, todayKey } from '../date'
import { addSubItem, ddayLabel, deleteDday, deleteTodo, removeSubItem, repeatStreak, saveDday, setMemo, shownColor, setRepeat, stopRepeat, updateSubItem, updateTodo, useStore, type RepeatRule } from '../store'
import { focusOn, formatDuration } from '../pomodoro'
import type { Reaction } from '../social'
import type { Category, Routine, Todo } from '../types'
import Sheet from './Sheet'
import TimeWheel from './TimeWheel'
import { CheckMarkIcon, CloseIcon, FlagIcon, PlusIcon, TomatoIcon } from './Icons'
import { DatePicker } from './DatePicker'
import { toast } from '../dialogs'

interface Props {
  todo: Todo
  categories: Category[]
  reactions: Reaction[]
  onClose: () => void
  onFocus: () => void
}

export default function TodoSheet({ todo, categories, reactions, onClose, onFocus }: Props) {
  const [title, setTitle] = useState(todo.title)
  const [picking, setPicking] = useState<'date' | 'time' | 'repeat' | null>(null)
  const { routines, notes, ddays } = useStore()
  const routine = routines.find((r) => r.id === todo.routine_id)
  const note = notes[todo.id]
  // a D-day made from this todo: same title and date
  const dday = ddays.find((d) => d.title === todo.title && d.date === todo.date)
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
      <p className="sheet-sub todo-sheet-date">
        {dayLabel(todo.date)}
        {todo.focus_seconds > 0 && (
          <>
            {' · '}
            <TomatoIcon /> {todo.pomodoros}회, 총 {formatDuration(todo.focus_seconds)} 집중
          </>
        )}
        {routine && repeatStreak(routine.id) > 0 && ` · ${repeatStreak(routine.id)}일 연속 달성`}
      </p>
      <input
        maxLength={200}
        className="sheet-input todo-sheet-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && close()}
      />
      <MemoField todoId={todo.id} value={note?.memo ?? ''} />
      <Checklist todoId={todo.id} items={note?.items ?? []} />
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
          className="pomo-start"
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
        <button className={picking === 'date' ? 'on' : ''} onClick={() => setPicking(picking === 'date' ? null : 'date')}>
          날짜 바꾸기
        </button>
      </div>
      {picking === 'date' && <DatePicker value={todo.date} onPick={(date) => (date === todo.date ? setPicking(null) : moveTo(date))} />}
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
          {routine ? ruleLabel(routine) : '반복 안 함'}
        </button>
      </div>
      {picking === 'repeat' && (
        <RepeatPicker
          date={todo.date}
          value={routine}
          onDone={(rule) => {
            saveTitle()
            setRepeat(todo.id, rule)
            setPicking(null)
          }}
          onStop={() => {
            stopRepeat(todo.id)
            setPicking(null)
          }}
        />
      )}
      <div className="pick-block">
        <span className="pick-label">카테고리</span>
        <div className="pick-chips">
          {categories.map((c) => (
            <button key={c.id} className={todo.category_id === c.id ? 'on' : ''} onClick={() => updateTodo(todo.id, { category_id: c.id })}>
              <span className="cat-dot" style={{ background: shownColor(c.color) }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <button
        className={`dday-toggle ${dday ? 'on' : ''}`}
        onClick={() => {
          if (dday) {
            deleteDday(dday.id)
            toast('D-day에서 뺐어요')
          } else {
            saveDday({ title: title.trim() || todo.title, date: todo.date })
            toast(`D-day로 등록했어요 (${ddayLabel(todo.date)})`)
          }
        }}
      >
        <FlagIcon /> {dday ? `D-day 표시 중 · ${ddayLabel(todo.date)}` : 'D-day로 표시'}
      </button>
      <button
        className="danger"
        onClick={() => {
          deleteTodo(todo.id)
          onClose()
          toast('할 일을 삭제했어요', { label: '되돌리기', run: () => updateTodo(todo.id, { deleted: false }) })
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

type RepeatKind = 'weekly' | 'biweekly' | 'monthly'

/** "매일", "격주 월·수", "매월 15일", "평일 · 12/20까지" */
export function ruleLabel(r: Pick<Routine, 'days' | 'every' | 'month_day' | 'end_date'>) {
  const base = r.month_day ? `매월 ${r.month_day}일` : (r.every > 1 ? '격주 ' : '') + repeatLabel(r.days)
  if (!r.end_date) return base
  const [, m, d] = r.end_date.split('-').map(Number)
  return `${base} · ${m}/${d}까지`
}

function RepeatPicker({ date, value, onDone, onStop }: { date: string; value?: Routine; onDone: (rule: RepeatRule) => void; onStop: () => void }) {
  const weekday = fromKey(date).getDay()
  const [kind, setKind] = useState<RepeatKind>(value?.month_day ? 'monthly' : (value?.every ?? 1) > 1 ? 'biweekly' : 'weekly')
  const [days, setDays] = useState(value?.days.length ? value.days : [weekday])
  const monthDay = value?.month_day ?? fromKey(date).getDate()
  const [end, setEnd] = useState<string | null>(value?.end_date ?? null)
  const [pickingEnd, setPickingEnd] = useState(false)
  const toggle = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])
  const rule = (): RepeatRule =>
    kind === 'monthly'
      ? { days: [], every: 1, month_day: monthDay, end_date: end }
      : { days, every: kind === 'biweekly' ? 2 : 1, month_day: null, end_date: end }
  return (
    <div className="repeat-box">
      <div className="repeat-kinds" role="tablist">
        {([['weekly', '매주'], ['biweekly', '격주'], ['monthly', '매월']] as [RepeatKind, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      {kind === 'weekly' && (
        <div className="repeat-presets">
          {PRESETS.map(([label, d]) => (
            <button key={label} className={[...days].sort().join() === d.join() ? 'on' : ''} onClick={() => setDays(d)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {kind === 'monthly' ? (
        <p className="repeat-note">매월 {monthDay}일에 반복해요{monthDay > 28 ? ' (그 날이 없는 달은 마지막 날)' : ''}</p>
      ) : (
        <div className="repeat-days">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button key={d} className={`${days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`} onClick={() => toggle(d)}>
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      )}
      <div className="field repeat-end">
        <span>끝나는 날</span>
        <span className="repeat-end-btns">
          {end && (
            <button className="time-btn ghost" onClick={() => setEnd(null)}>
              없음으로
            </button>
          )}
          <button className="time-btn" onClick={() => setPickingEnd(!pickingEnd)}>
            {end ? end.slice(5).replace('-', '/') : '계속 반복'}
          </button>
        </span>
      </div>
      {pickingEnd && (
        <DatePicker
          value={end ?? date}
          onPick={(d) => {
            setEnd(d < date ? date : d)
            setPickingEnd(false)
          }}
        />
      )}
      <div className="actions">
        {value && <button onClick={onStop}>반복 끄기</button>}
        <button className="primary" disabled={kind !== 'monthly' && !days.length} onClick={() => onDone(rule())}>
          확인
        </button>
      </div>
    </div>
  )
}

/** The todo's memo, saved when the field loses focus. */
function MemoField({ todoId, value }: { todoId: string; value: string }) {
  const [text, setText] = useState(value)
  const el = useRef<HTMLTextAreaElement>(null)
  const grow = () => {
    const t = el.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${t.scrollHeight}px`
  }
  return (
    <textarea
      ref={(t) => {
        el.current = t
        grow()
      }}
      className="memo-input"
      rows={1}
      maxLength={2000}
      placeholder="메모 (링크, 준비물, 조건 등)"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        grow()
      }}
      onBlur={() => text !== value && setMemo(todoId, text.trim() ? text : '')}
    />
  )
}

/** Small steps inside one todo. */
function Checklist({ todoId, items }: { todoId: string; items: { id: string; title: string; done: boolean }[] }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (t) addSubItem(todoId, t)
    setDraft('')
  }
  const done = items.filter((it) => it.done).length
  return (
    <div className="checklist">
      {items.length > 0 && (
        <p className="checklist-head">
          체크리스트 <span>{done}/{items.length}</span>
        </p>
      )}
      <ul>
        {items.map((it) => (
          <li key={it.id} className={it.done ? 'done' : ''}>
            <button className="sub-check" aria-label={it.done ? '완료 취소' : '완료'} onClick={() => updateSubItem(todoId, it.id, { done: !it.done })}>
              {it.done && <CheckMarkIcon />}
            </button>
            <input
              maxLength={100}
              defaultValue={it.title}
              onBlur={(e) => {
                const t = e.target.value.trim()
                if (!t) removeSubItem(todoId, it.id)
                else if (t !== it.title) updateSubItem(todoId, it.id, { title: t })
              }}
            />
            <button className="sub-remove" aria-label="항목 삭제" onClick={() => removeSubItem(todoId, it.id)}>
              <CloseIcon />
            </button>
          </li>
        ))}
        {items.length < 50 && (
          <li className="sub-add">
            <span className="sub-plus">
              <PlusIcon />
            </span>
            <input
              maxLength={100}
              placeholder="체크리스트 항목 추가"
              value={draft}
              enterKeyHint="done"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()}
              onBlur={add}
            />
          </li>
        )}
      </ul>
    </div>
  )
}

