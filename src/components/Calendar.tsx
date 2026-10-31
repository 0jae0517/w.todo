import { holidayName } from '../holidays'
import { WEEKDAYS, addDays, addMonths, fromKey, monthGrid, monthLabel, todayKey, weekOf } from '../date'
import { shownColor } from '../store'
import type { Category, Todo } from '../types'
import { CheckMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'

export interface DayStat {
  total: number
  left: number
  /** every todo of the day in list order: its category colour and whether it is done */
  items: { color: string; cat: string; done: boolean }[]
}

/** Per-day counts plus the colours the calendar cell is filled with. */
export function dayStats(todos: Todo[], categories: Category[]) {
  const cats = new Map(categories.map((c) => [c.id, c]))
  const sorted = [...todos].sort(
    (a, b) => (cats.get(a.category_id)?.position ?? 1e9) - (cats.get(b.category_id)?.position ?? 1e9) || a.position - b.position,
  )
  const m = new Map<string, DayStat>()
  for (const t of sorted) {
    const s = m.get(t.date) ?? { total: 0, left: 0, items: [] }
    s.total++
    if (!t.done) s.left++
    s.items.push({ color: shownColor(cats.get(t.category_id)?.color ?? '#dddddd'), cat: t.category_id, done: t.done })
    m.set(t.date, s)
  }
  return m
}

const VARIANT = () => (window as unknown as { __cal?: string }).__cal ?? 'ring'

/** Unique categories of the day with how many of their todos are done. */
function byCategory(items: DayStat['items']) {
  const m = new Map<string, { color: string; done: number; total: number }>()
  for (const it of items) {
    const g = m.get(it.cat) ?? { color: it.color, done: 0, total: 0 }
    g.total++
    if (it.done) g.done++
    m.set(it.cat, g)
  }
  return [...m.values()]
}

function Ring({ s }: { s: DayStat }) {
  const r = 12, c = 2 * Math.PI * r, n = s.items.length, gap = n > 1 ? 2.2 : 0
  const seg = c / n
  return (
    <span className="mark mk-ring">
      <svg viewBox="0 0 30 30" aria-hidden>
        {s.items.map((it, i) => (
          <circle key={i} cx="15" cy="15" r={r} fill="none" strokeWidth="3.2" strokeLinecap="butt"
            stroke={it.done ? it.color : 'var(--ring-track)'}
            strokeDasharray={`${seg - gap} ${c - seg + gap}`} strokeDashoffset={-i * seg}
            transform="rotate(-90 15 15)" />
        ))}
      </svg>
      <b>{s.left || <CheckMarkIcon />}</b>
    </span>
  )
}

function Mark({ s }: { s?: DayStat }) {
  if (!s?.total) return <span className="mark" />
  const v = VARIANT()
  if (v === 'ring') return <Ring s={s} />
  if (v === 'bars')
    return (
      <span className={`mark mk-bars ${s.left ? '' : 'all'}`}>
        {byCategory(s.items).map((g, i) => (
          <i key={i}><i style={{ height: `${(g.done / g.total) * 100}%`, background: g.color }} /></i>
        ))}
      </span>
    )
  return (
    <span className={`mark ${s.left ? 'has-left' : 'mk-done'}`}>{s.left || <CheckMarkIcon />}</span>
  )
}

function Dots({ s }: { s?: DayStat }) {
  if (VARIANT() !== 'dots') return null
  const done = s ? byCategory(s.items).filter((g) => g.done) : []
  return (
    <span className="mk-dots">
      {done.slice(0, 4).map((g, i) => <i key={i} style={{ background: g.color }} />)}
    </span>
  )
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
              <Mark s={s} />
              <span className="num">{d.getDate()}</span>
              <Dots s={s} />
            </button>
          )
        })}
      </div>
    </section>
  )
}
