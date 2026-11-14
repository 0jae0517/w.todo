import { useState } from 'react'
import { WEEKDAYS, addMonths, dayLabel, fromKey, monthGrid, monthLabel, todayKey } from '../date'
import { holidayName } from '../holidays'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

/**
 * In-sheet month picker. The old hidden <input type="date"> overlay didn't open
 * on desktop browsers (only its tiny calendar icon does) and fired onChange on
 * every wheel scroll on iOS, so we draw our own.
 */
export function DatePicker({ value, onPick }: { value: string; onPick: (date: string) => void }) {
  const [view, setView] = useState(value.slice(0, 8) + '01')
  const today = todayKey()
  const month = fromKey(view).getMonth()
  return (
    <div className="repeat-box date-pick">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setView(addMonths(view, -1))} aria-label="이전 달">
          <ChevronLeftIcon />
        </button>
        <span className="cal-title">{monthLabel(view)}</span>
        <button className="icon-btn" onClick={() => setView(addMonths(view, 1))} aria-label="다음 달">
          <ChevronRightIcon />
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</div>
        ))}
        {monthGrid(view).map((key) => {
          const d = fromKey(key)
          const holiday = holidayName(key)
          const cls = [
            'cal-day',
            d.getMonth() !== month && 'outside',
            key === value && 'selected',
            key === today && 'today',
            holiday || d.getDay() === 0 ? 'red' : d.getDay() === 6 ? 'blue' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={key} className={cls} onClick={() => onPick(key)} aria-label={dayLabel(key)} title={holiday}>
              <span className="num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A date field for forms: shows the chosen day and opens the month picker
 * below it. Use this instead of <input type="date"> (see DatePicker).
 */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="field">
        <span>{label}</span>
        <button type="button" className={`date-field ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          {value.slice(0, 4) === todayKey().slice(0, 4) ? dayLabel(value) : `${value.slice(0, 4)}년 ${dayLabel(value)}`}
        </button>
      </div>
      {open && (
        <DatePicker
          value={value}
          onPick={(d) => {
            onChange(d)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
