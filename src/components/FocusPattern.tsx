import { useMemo } from 'react'
import { WEEKDAYS } from '../date'
import { formatDuration } from '../pomodoro'
import type { FocusSession } from '../types'

const MIN_SESSIONS = 5
const BLOCK = 3 // hours per column
const ROWS = [1, 2, 3, 4, 5, 6, 0] // Monday first

const blockLabel = (b: number) => {
  const h = b * BLOCK
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시`
}

/** When (weekday × time of day) Pomodoro focus sessions happen. */
export default function FocusPattern({ sessions }: { sessions: FocusSession[] }) {
  const p = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array<number>(24 / BLOCK).fill(0))
    const byDay = Array<number>(7).fill(0)
    const byBlock = Array<number>(24 / BLOCK).fill(0)
    for (const s of sessions) {
      const d = new Date(s.started_at)
      const b = Math.floor(d.getHours() / BLOCK)
      grid[d.getDay()][b] += s.seconds
      byDay[d.getDay()] += s.seconds
      byBlock[b] += s.seconds
    }
    const max = Math.max(...grid.flat())
    const bestDay = byDay.indexOf(Math.max(...byDay))
    const bestBlock = byBlock.indexOf(Math.max(...byBlock))
    return { grid, max, bestDay, bestBlock }
  }, [sessions])

  if (sessions.length < MIN_SESSIONS)
    return <p className="sheet-sub">뽀모도로를 {MIN_SESSIONS}번 이상 마치면 언제 집중이 잘 되는지 보여 드려요. (지금 {sessions.length}번)</p>

  return (
    <div className="pattern">
      <p className="pattern-summary">
        <b>{WEEKDAYS[p.bestDay]}요일</b>, <b>{blockLabel(p.bestBlock)}~{blockLabel(p.bestBlock + 1)}</b>에 가장 많이 집중했어요.
      </p>
      <div className="pattern-grid">
        <span />
        {p.grid[0].map((_, b) => (
          <span key={b} className="pattern-head">{b % 2 === 0 ? b * BLOCK : ''}</span>
        ))}
        {ROWS.map((d) => (
          <div key={d} className="pattern-row">
            <span className={`pattern-day ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}`}>{WEEKDAYS[d]}</span>
            {p.grid[d].map((sec, b) => (
              <span
                key={b}
                className="pattern-cell"
                style={sec ? { opacity: 0.2 + 0.8 * (sec / p.max) } : { background: 'var(--bg)' }}
                title={sec ? `${WEEKDAYS[d]} ${blockLabel(b)}: ${formatDuration(sec)}` : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="heat-info">총 {sessions.length}번 집중 기록 · 진할수록 오래 집중한 시간대</p>
    </div>
  )
}
