import { useState } from 'react'
import { dayLabel, todayKey } from '../date'
import { ddayLabel, deleteDday, saveDday, useStore } from '../store'
import type { Dday } from '../types'
import { DatePicker } from './DatePicker'
import { FlagIcon, PlusIcon, TrashIcon } from './Icons'
import Sheet from './Sheet'

/** Upcoming D-days above the calendar; tap to manage them. Hidden when there are none. */
export function DdayStrip({ onOpen }: { onOpen: () => void }) {
  const { ddays } = useStore()
  const today = todayKey()
  const upcoming = ddays.filter((d) => d.date >= today)
  if (!upcoming.length) return null
  return (
    <button className="dday-strip" onClick={onOpen} aria-label="D-day 관리">
      <FlagIcon />
      {upcoming.slice(0, 3).map((d) => (
        <span key={d.id} className={`dday-chip ${d.date === today ? 'today' : ''}`}>
          <strong>{ddayLabel(d.date, today)}</strong> {d.title}
        </span>
      ))}
      {upcoming.length > 3 && <span className="dday-more">+{upcoming.length - 3}</span>}
    </button>
  )
}

/** Add, rename, move or remove D-days. */
export function DdaySheet({ onClose }: { onClose: () => void }) {
  const { ddays } = useStore()
  const today = todayKey()
  const [editing, setEditing] = useState<Dday | 'new' | null>(ddays.length ? null : 'new')
  const upcoming = ddays.filter((d) => d.date >= today)
  const past = ddays.filter((d) => d.date < today).reverse()

  return (
    <Sheet onClose={onClose} title="D-day">
      {editing ? (
        <DdayForm key={editing === 'new' ? 'new' : editing.id} dday={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
      ) : (
        <>
          <ul className="dday-list">
            {[...upcoming, ...past].map((d) => (
              <li key={d.id} className={d.date < today ? 'past' : ''}>
                <button className="dday-row" onClick={() => setEditing(d)}>
                  <strong>{ddayLabel(d.date, today)}</strong>
                  <span className="dday-row-title">{d.title}</span>
                  <span className="muted">{dayLabel(d.date)}</span>
                </button>
                <button className="icon-btn" aria-label="삭제" onClick={() => deleteDday(d.id)}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
          {!ddays.length && <p className="sheet-sub">시험이나 마감일을 넣으면 할 일 화면 위에 남은 날짜가 보여요.</p>}
          <button className="dday-add" onClick={() => setEditing('new')}>
            <PlusIcon /> D-day 추가
          </button>
        </>
      )}
    </Sheet>
  )
}

function DdayForm({ dday, onDone }: { dday?: Dday; onDone: () => void }) {
  const [title, setTitle] = useState(dday?.title ?? '')
  const [date, setDate] = useState(dday?.date ?? todayKey())
  const save = () => {
    if (!title.trim()) return
    saveDday({ id: dday?.id, title: title.trim(), date })
    onDone()
  }
  return (
    <div className="dday-form">
      <input
        className="sheet-input"
        maxLength={40}
        autoFocus={!dday}
        placeholder="이름 (예: 기말고사)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()}
      />
      <p className="dday-form-date">
        {dayLabel(date)} · <strong>{ddayLabel(date)}</strong>
      </p>
      <DatePicker value={date} onPick={setDate} />
      <div className="actions">
        <button onClick={onDone}>취소</button>
        <button className="primary" disabled={!title.trim()} onClick={save}>
          저장
        </button>
      </div>
    </div>
  )
}
