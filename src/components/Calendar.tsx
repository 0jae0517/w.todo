import { WEEKDAYS, addDays, addMonths, fromKey, monthGrid, monthLabel, todayKey, weekOf } from '../date'

export interface DayStat {
  total: number
  left: number
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
  const step = (dir: -1 | 1) => onSelect(mode === 'week' ? addDays(selected, dir * 7) : addMonths(selected, dir))

  return (
    <section className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="이전">‹</button>
        <button className="cal-title" onClick={() => onModeChange(mode === 'week' ? 'month' : 'week')}>
          {monthLabel(selected)} <span className="caret">{mode === 'week' ? '▾' : '▴'}</span>
        </button>
        <button className="icon-btn" onClick={() => step(1)} aria-label="다음">›</button>
        {selected !== today && (
          <button className="pill" onClick={() => onSelect(today)}>오늘</button>
        )}
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</div>
        ))}
        {days.map((key) => {
          const s = stats.get(key)
          const d = fromKey(key)
          const outside = mode === 'month' && d.getMonth() !== month
          const cls = ['cal-day', outside && 'outside', key === selected && 'selected', key === today && 'today']
            .filter(Boolean)
            .join(' ')
          return (
            <button key={key} className={cls} onClick={() => onSelect(key)} aria-label={key}>
              <span className={`mark ${s?.total ? (s.left ? 'has-left' : 'all-done') : ''}`}>
                {s?.total ? (s.left ? s.left : '✓') : ''}
              </span>
              <span className="num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
