import { holidayName } from '../holidays'
import { WEEKDAYS, addDays, addMonths, fromKey, monthGrid, monthLabel, todayKey, weekOf } from '../date'
import { inkFor, shownColor } from '../store'
import type { Category, Todo } from '../types'
import { CheckMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'

export interface DayStat {
  total: number
  left: number
  /** category colours of the day's completed todos, in list order (one entry per todo) */
  done: string[]
}

/** Per-day counts plus the colours the calendar cell is filled with. */
export function dayStats(todos: Todo[], categories: Category[]) {
  const cats = new Map(categories.map((c) => [c.id, c]))
  const sorted = [...todos].sort(
    (a, b) => (cats.get(a.category_id)?.position ?? 1e9) - (cats.get(b.category_id)?.position ?? 1e9) || a.position - b.position,
  )
  const m = new Map<string, DayStat>()
  for (const t of sorted) {
    const s = m.get(t.date) ?? { total: 0, left: 0, done: [] }
    s.total++
    if (t.done) s.done.push(shownColor(cats.get(t.category_id)?.color ?? '#dddddd'))
    else s.left++
    m.set(t.date, s)
  }
  return m
}

/** Equal horizontal bands, one per completed todo, so a single one fills the whole cell. */
function fill(colors: string[]) {
  if (!colors.length) return undefined
  const n = colors.length
  const stops = colors.map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
  return { background: n === 1 ? colors[0] : `linear-gradient(to bottom, ${stops.join(', ')})`, color: inkFor(colors[Math.floor(n / 2)]) }
}

interface Props {
  selected: string
  onSelect: (key: string) => void
  mode: 'week' | 'month'
  onModeChange: (mode: 'week' | 'month') => void
  stats: Map<string, DayStat>
}

export default function Calendar({ selected, onSelect, mode, onModeChange, stats }: Props) {
  const today = todayKey()
  const days = mode === 'week' ? weekOf(selected) : monthGrid(selected)
  const month = fromKey(selected).getMonth()
  // Month view: next → 1st of next month, prev → last day of previous month.
  const step = (dir: -1 | 1) => {
    if (mode === 'week') return onSelect(addDays(selected, dir * 7))
    const first = selected.slice(0, 8) + '01'
    onSelect(dir === 1 ? addMonths(first, 1) : addDays(first, -1))
  }

  return (
    <section className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="이전">
          <ChevronLeftIcon />
        </button>
        <span className="cal-title">{monthLabel(selected)}</span>
        <button className="icon-btn" onClick={() => step(1)} aria-label="다음">
          <ChevronRightIcon />
        </button>
        <span className="cal-tools">
          {selected !== today && (
            <button className="pill" onClick={() => onSelect(today)}>오늘</button>
          )}
          <span className="mode-seg" role="group" aria-label="보기">
            <button className={mode === 'week' ? 'on' : ''} onClick={() => onModeChange('week')} aria-pressed={mode === 'week'}>주</button>
            <button className={mode === 'month' ? 'on' : ''} onClick={() => onModeChange('month')} aria-pressed={mode === 'month'}>월</button>
          </span>
        </span>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</div>
        ))}
        {days.map((key) => {
          const s = stats.get(key)
          const d = fromKey(key)
          const outside = mode === 'month' && d.getMonth() !== month
          const holiday = holidayName(key)
          const dayColor = holiday || d.getDay() === 0 ? 'red' : d.getDay() === 6 ? 'blue' : ''
          const cls = ['cal-day', outside && 'outside', key === selected && 'selected', key === today && 'today', dayColor]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={key} className={cls} onClick={() => onSelect(key)} aria-label={holiday ? `${key} ${holiday}` : key} title={holiday}>
              <span className={`mark ${s?.total ? (s.left ? 'has-left' : 'all-done') : ''}`} style={fill(s?.done ?? [])}>
                {s?.total ? s.left || <CheckMarkIcon /> : ''}
              </span>
              <span className="num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
