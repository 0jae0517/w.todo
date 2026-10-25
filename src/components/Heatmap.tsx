import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, dayLabel, fromKey, todayKey, weekOf } from '../date'
import type { Category, Todo } from '../types'

/** a year to scroll back through */
const WEEKS = 53
const ALL = 'all'

/** GitHub-style grid of finished todos, one column per week: about three months fit on screen, older weeks scroll in from the left. */
export default function Heatmap({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const [cat, setCat] = useState(ALL)
  const [picked, setPicked] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // leftmost column in view, so its month is always labelled
  const [firstCol, setFirstCol] = useState(0)
  const onScroll = () => {
    const el = scroller.current
    const cell = el?.querySelector('.heat-cell')?.getBoundingClientRect().width
    if (el && cell) setFirstCol(Math.round(el.scrollLeft / (cell + 4)))
  }
  const today = todayKey()

  const days = useMemo(() => {
    const start = addDays(weekOf(today)[0], -7 * (WEEKS - 1))
    return Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  }, [today])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of todos) if (t.done && (cat === ALL || t.category_id === cat)) m.set(t.date, (m.get(t.date) ?? 0) + 1)
    return m
  }, [todos, cat])

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth })
    onScroll()
  }, [])

  const color = categories.find((c) => c.id === cat)?.color ?? 'var(--accent)'
  const total = days.reduce((s, d) => s + (counts.get(d) ?? 0), 0)
  const activeDays = days.filter((d) => counts.has(d)).length
  const used = categories.filter((c) => todos.some((t) => t.done && t.category_id === c.id))

  return (
    <div className="heatmap">
      <div className="chips">
        <button className={cat === ALL ? 'on' : ''} onClick={() => setCat(ALL)}>전체</button>
        {used.map((c) => (
          <button key={c.id} className={cat === c.id ? 'on' : ''} style={cat === c.id ? { background: c.color } : undefined} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="heat-scroll" ref={scroller} onScroll={onScroll}>
        <div className="heat-months">
          {Array.from({ length: WEEKS }, (_, w) => {
            // label each week a month starts in, and the leftmost one in view (unless the next one is labelled anyway)
            const week = days.slice(w * 7, w * 7 + 7)
            const startsMonth = (ws: string[]) => ws.find((d) => d.endsWith('-01'))
            const first = startsMonth(week) ?? (w === firstCol && !startsMonth(days.slice(w * 7 + 7, w * 7 + 14)) ? week[6] : undefined)
            return <span key={w}>{first ? `${fromKey(first).getMonth() + 1}월` : ''}</span>
          })}
        </div>
        <div className="heat-grid">
          {days.map((d) => {
            const n = counts.get(d) ?? 0
            return (
              <button
                key={d}
                className={`heat-cell ${d > today ? 'future' : ''} ${picked === d ? 'picked' : ''}`}
                style={n ? { background: color, opacity: Math.min(0.35 + n * 0.2, 1) } : undefined}
                onClick={() => setPicked(picked === d ? null : d)}
                aria-label={`${dayLabel(d)} ${n}개 완료`}
              />
            )
          })}
        </div>
      </div>
      <p className="heat-info">
        {picked ? `${dayLabel(picked)} · ${counts.get(picked) ?? 0}개 완료` : `최근 1년 동안 ${activeDays}일, ${total}개 완료`}
      </p>
    </div>
  )
}
