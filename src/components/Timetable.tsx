import { useState } from 'react'
import { WEEKDAYS, timeLabel, todayKey } from '../date'
import { PALETTE, inkFor, deleteCourse, saveCourse, setTerm, useStore } from '../store'
import { classesOn, currentTerm, termLabel, toMinutes, type ClassOnDay } from '../timetable'
import type { Course, Slot } from '../types'
import { CloseIcon, PencilIcon } from './Icons'
import Sheet from './Sheet'
import TimeWheel from './TimeWheel'

const HOUR = 52
/** Monday first, like most timetables. */
const ORDER = [1, 2, 3, 4, 5, 6, 0]

/** The weekly grid of classes, 에브리타임 style. */
export default function Timetable() {
  const { courses } = useStore()
  const [editing, setEditing] = useState<Course | 'new' | null>(null)
  const [termOpen, setTermOpen] = useState(false)
  const term = currentTerm(courses)

  const slots = courses.flatMap((c) => c.slots.map((s) => ({ course: c, slot: s })))
  const used = new Set(slots.map((s) => s.slot.day))
  const days = ORDER.filter((d) => d >= 1 && d <= 5 || used.has(d))
  const first = Math.min(9, ...slots.map((s) => Math.floor(toMinutes(s.slot.start) / 60)))
  const last = Math.max(18, ...slots.map((s) => Math.ceil(toMinutes(s.slot.end) / 60)))
  const hours = Array.from({ length: last - first }, (_, i) => first + i)
  const today = new Date().getDay()

  return (
    <main className="timetable">
      <div className="tt-head">
        <button className="tt-term" onClick={() => courses.length && setTermOpen(true)} disabled={!courses.length}>
          {termLabel(term)}
          {courses.length > 0 && <PencilIcon />}
        </button>
        <button className="primary tt-add" onClick={() => setEditing('new')}>+ 수업 추가</button>
      </div>

      <div className="tt-grid" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => (
          <div key={d} className={`tt-day ${d === today ? 'today' : ''}`}>{WEEKDAYS[d]}</div>
        ))}
        <div className="tt-hours">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR }}>{h > 12 ? h - 12 : h}</div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className="tt-col" style={{ height: hours.length * HOUR }}>
            {hours.map((h) => (
              <div key={h} className="tt-line" style={{ top: (h - first) * HOUR }} />
            ))}
            {slots
              .filter((s) => s.slot.day === d)
              .map(({ course, slot }, i) => (
                <button
                  key={course.id + i}
                  className="tt-block"
                  style={{
                    top: ((toMinutes(slot.start) - first * 60) / 60) * HOUR,
                    height: Math.max(22, ((toMinutes(slot.end) - toMinutes(slot.start)) / 60) * HOUR - 2),
                    background: course.color,
                    color: inkFor(course.color),
                  }}
                  onClick={() => setEditing(course)}
                >
                  <strong>{course.title}</strong>
                  {course.room && <span>{course.room}</span>}
                </button>
              ))}
          </div>
        ))}
      </div>

      {!courses.length && <p className="sheet-sub tt-empty">수업을 추가하면 학기 동안 할 일 화면에도 그날 수업이 자동으로 보여요.</p>}

      {editing && <CourseSheet course={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {termOpen && <TermSheet term={term} onClose={() => setTermOpen(false)} />}
    </main>
  )
}

/** Today's classes, shown above the day's todos. */
export function DayClasses({ date, onOpen }: { date: string; onOpen: (c: Course) => void }) {
  const { courses } = useStore()
  const list = classesOn(date, courses)
  if (!list.length) return null
  const now = date === todayKey() ? new Date().getHours() * 60 + new Date().getMinutes() : -1
  return (
    <section className="day-classes">
      <h3 className="group-label">수업</h3>
      <ul>
        {list.map(({ course, slot }: ClassOnDay, i) => (
          <li key={course.id + i} className={now >= toMinutes(slot.end) ? 'over' : ''}>
            <button onClick={() => onOpen(course)}>
              <span className="class-bar" style={{ background: course.color }} />
              <span className="class-time">
                {timeLabel(slot.start)}
                <small> ~ {timeLabel(slot.end).replace(/^오[전후] /, '')}</small>
              </span>
              <span className="class-title">{course.title}</span>
              {course.room && <span className="muted class-room">{course.room}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CourseSheet({ course, onClose }: { course?: Course; onClose: () => void }) {
  const { courses } = useStore()
  const [title, setTitle] = useState(course?.title ?? '')
  const [room, setRoom] = useState(course?.room ?? '')
  const [color, setColor] = useState(course?.color ?? PALETTE.find((p) => !courses.some((c) => c.color === p)) ?? PALETTE[courses.length % PALETTE.length])
  const [slots, setSlots] = useState<Slot[]>(course?.slots ?? [{ day: 1, start: '09:00', end: '10:15' }])
  const [picking, setPicking] = useState<{ i: number; edge: 'start' | 'end' } | null>(null)

  const patch = (i: number, p: Partial<Slot>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const valid = title.trim() && slots.length && slots.every((s) => s.start < s.end)
  const save = () => {
    if (!valid) return
    saveCourse({ id: course?.id, title: title.trim(), room: room.trim(), color, slots, ...pickTerm(course, courses) })
    onClose()
  }

  return (
    <Sheet onClose={onClose} title={course ? '수업 수정' : '수업 추가'}>
      <input className="sheet-input" placeholder="수업 이름 (예: 자료구조)" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!course} />
      <input className="sheet-input small" placeholder="강의실 (선택)" value={room} onChange={(e) => setRoom(e.target.value)} />
      <div className="swatches">
        {PALETTE.map((p) => (
          <button key={p} className={`swatch ${p === color ? 'on' : ''}`} style={{ background: p }} onClick={() => setColor(p)} aria-label="색상" />
        ))}
      </div>

      <h3 className="sub-title">수업 시간</h3>
      {slots.map((s, i) => (
        <div key={i} className="slot">
          <div className="repeat-days">
            {ORDER.map((d) => (
              <button key={d} className={`${s.day === d ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`} onClick={() => patch(i, { day: d })}>{WEEKDAYS[d]}</button>
            ))}
          </div>
          <div className="slot-times">
            <button className="time-btn" onClick={() => setPicking({ i, edge: 'start' })}>{timeLabel(s.start)}</button>
            <span>~</span>
            <button className="time-btn" onClick={() => setPicking({ i, edge: 'end' })}>{timeLabel(s.end)}</button>
            {slots.length > 1 && (
              <button className="slot-remove" onClick={() => setSlots(slots.filter((_, j) => j !== i))} aria-label="이 시간 빼기">
                <CloseIcon />
              </button>
            )}
          </div>
          {s.start >= s.end && <p className="error">끝나는 시간이 시작보다 늦어야 해요</p>}
          {picking?.i === i && (
            <TimeWheel
              key={picking.edge}
              value={s[picking.edge]}
              clearLabel="취소"
              onClear={() => setPicking(null)}
              onDone={(t) => {
                const p: Partial<Slot> = { [picking.edge]: t }
                // moving the start keeps the class length
                if (picking.edge === 'start') p.end = shift(t, toMinutes(s.end) - toMinutes(s.start))
                patch(i, p)
                setPicking(null)
              }}
            />
          )}
        </div>
      ))}
      <button
        className="link-btn"
        onClick={() => {
          const l = slots[slots.length - 1]
          // MWF / TTh patterns are the common ones
          setSlots([...slots, { ...l, day: l.day + 2 <= 5 ? l.day + 2 : 1 }])
        }}
      >
        + 다른 요일·시간 추가
      </button>

      <button className="primary wide" disabled={!valid} onClick={save}>저장</button>
      {course && (
        <button
          className="danger"
          onClick={() => {
            if (!confirm(`'${course.title}' 수업을 시간표에서 지울까요?`)) return
            deleteCourse(course.id)
            onClose()
          }}
        >
          삭제
        </button>
      )}
    </Sheet>
  )
}

/** A class keeps its own term; a new one joins the timetable's current term. */
function pickTerm(course: Course | undefined, courses: Course[]) {
  return course ? { term_start: course.term_start, term_end: course.term_end } : currentTerm(courses)
}

function shift(hhmm: string, minutes: number) {
  const m = Math.min(23 * 60 + 55, toMinutes(hhmm) + minutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function TermSheet({ term, onClose }: { term: { term_start: string; term_end: string }; onClose: () => void }) {
  const [start, setStart] = useState(term.term_start)
  const [end, setEnd] = useState(term.term_end)
  const valid = start && end && start < end
  return (
    <Sheet onClose={onClose} title="학기 기간">
      <p className="sheet-sub">이 기간 동안 매주 수업이 할 일 화면에 보여요. 공휴일에는 보이지 않아요.</p>
      <label className="field">
        <span>개강</span>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="field">
        <span>종강</span>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <button
        className="primary wide"
        disabled={!valid}
        onClick={() => {
          setTerm(start, end)
          onClose()
        }}
      >
        저장
      </button>
    </Sheet>
  )
}
