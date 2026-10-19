import { useEffect, useRef, useState } from 'react'

const ITEM = 40
const AMPM = ['오전', '오후']
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

/** iOS-style scroll wheels for 오전/오후 · hour · minute (5-minute steps). */
export default function TimeWheel({ value, onDone, onClear }: { value: string | null; onDone: (hhmm: string) => void; onClear: () => void }) {
  const [h, m] = (value ?? '09:00').split(':').map(Number)
  const [ampm, setAmpm] = useState(h < 12 ? 0 : 1)
  const [hour, setHour] = useState((h % 12 || 12) - 1)
  const [minute, setMinute] = useState(Math.min(11, Math.round(m / 5)))

  const done = () => {
    const h24 = ((hour + 1) % 12) + (ampm ? 12 : 0)
    onDone(`${String(h24).padStart(2, '0')}:${MINUTES[minute]}`)
  }

  return (
    <div className="wheel-box">
      <div className="wheels">
        <div className="wheel-band" />
        <Wheel items={AMPM} index={ampm} onChange={setAmpm} />
        <Wheel items={HOURS} index={hour} onChange={setHour} />
        <Wheel items={MINUTES} index={minute} onChange={setMinute} />
      </div>
      <div className="actions">
        <button onClick={onClear}>시간 없음</button>
        <button className="primary" onClick={done}>확인</button>
      </div>
    </div>
  )
}

function Wheel({ items, index, onChange }: { items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    ref.current?.scrollTo({ top: index * ITEM })
    // only on mount: afterwards the scroll position is the source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={ref}
      className="wheel"
      onScroll={(e) => {
        const el = e.currentTarget
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)))
          if (i !== index) onChange(i)
        }, 80)
      }}
    >
      {items.map((label, i) => (
        <div
          key={label}
          className={`wheel-item ${i === index ? 'on' : ''}`}
          onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' })}
        >
          {label}
        </div>
      ))}
    </div>
  )
}
