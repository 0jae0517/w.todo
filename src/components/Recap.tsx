import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, fromKey, todayKey, toKey } from '../date'
import { formatDuration } from '../pomodoro'
import type { Category, Todo } from '../types'

const MIN_DONE = 5
const W = 1080
const H = 1350
const FONT = '"Pretendard", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

type Period = 'lastMonth' | 'thisMonth' | 'thisYear'

function range(p: Period) {
  const today = fromKey(todayKey())
  const y = today.getFullYear()
  const m = today.getMonth()
  if (p === 'thisYear') return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}년` }
  const first = toKey(new Date(y, p === 'lastMonth' ? m - 1 : m, 1))
  const d = fromKey(first)
  return { from: first, to: addDays(addMonths(first, 1), -1), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` }
}

export interface RecapStats {
  label: string
  done: number
  total: number
  focus: number
  bestStreak: number
  topCategory: { cat: Category; done: number } | null
  topTitle: { title: string; done: number } | null
  topFocus: Todo | null
}

function compute(p: Period, todos: Todo[], categories: Category[]): RecapStats {
  const { from, to, label } = range(p)
  const list = todos.filter((t) => t.date >= from && t.date <= to)
  const done = list.filter((t) => t.done)

  const doneDays = new Set(done.map((t) => t.date))
  let bestStreak = 0
  let run = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    run = doneDays.has(d) ? run + 1 : 0
    bestStreak = Math.max(bestStreak, run)
  }

  const count = <K,>(keys: K[]) => {
    const m = new Map<K, number>()
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1])[0]
  }
  const cat = count(done.map((t) => t.category_id))
  const title = count(done.map((t) => t.title.trim()))
  const topFocus = [...list].sort((a, b) => b.focus_seconds - a.focus_seconds)[0]

  return {
    label,
    done: done.length,
    total: list.length,
    focus: list.reduce((s, t) => s + t.focus_seconds, 0),
    bestStreak,
    topCategory: cat && categories.find((c) => c.id === cat[0]) ? { cat: categories.find((c) => c.id === cat[0])!, done: cat[1] } : null,
    topTitle: title && title[1] > 1 ? { title: title[0], done: title[1] } : null,
    topFocus: topFocus?.focus_seconds ? topFocus : null,
  }
}

/** True in the first week of a month when last month has enough to recap. */
export function recapReady(todos: Todo[], categories: Category[]) {
  return fromKey(todayKey()).getDate() <= 7 && compute('lastMonth', todos, categories).done >= MIN_DONE
}

export const lastMonthLabel = () => range('lastMonth').label

export default function Recap({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const [period, setPeriod] = useState<Period>(() => (recapReady(todos, categories) ? 'lastMonth' : 'thisMonth'))
  const stats = useMemo(() => compute(period, todos, categories), [period, todos, categories])
  const canvas = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const enough = stats.done >= MIN_DONE

  useEffect(() => {
    if (!enough || !canvas.current) return setUrl(null)
    draw(canvas.current, stats)
    setUrl(canvas.current.toDataURL('image/png'))
  }, [stats, enough])

  const save = () =>
    canvas.current?.toBlob(async (blob) => {
      if (!blob) return
      const name = `w.todo-${stats.label.replace(/\s/g, '')}.png`
      const file = new File([blob], name, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${stats.label} 회고` })
          return
        } catch {
          // cancelled; fall through to download
        }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      URL.revokeObjectURL(a.href)
    })

  return (
    <div>
      <div className="chips">
        {(['lastMonth', 'thisMonth', 'thisYear'] as Period[]).map((p) => (
          <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>
            {{ lastMonth: '지난달', thisMonth: '이번 달', thisYear: '올해' }[p]}
          </button>
        ))}
      </div>
      <canvas ref={canvas} width={W} height={H} hidden />
      {enough && url ? (
        <>
          <img className="recap-img" src={url} alt={`${stats.label} 회고`} />
          <button className="primary wide" onClick={save}>이미지 저장·공유</button>
        </>
      ) : (
        <p className="empty">
          {stats.label}에 완료한 일이 {stats.done}개예요. {MIN_DONE}개 이상 쌓이면 회고 카드를 만들어 드려요.
        </p>
      )}
    </div>
  )
}

function draw(c: HTMLCanvasElement, s: RecapStats) {
  const g = c.getContext('2d')!
  const accent = s.topCategory?.cat.color ?? '#4f7cff'

  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#111827')
  bg.addColorStop(1, '#1f2937')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = accent
  g.fillRect(0, 0, W, 16)

  const text = (str: string, x: number, y: number, size: number, color = '#fff', weight = 700) => {
    g.font = `${weight} ${size}px ${FONT}`
    g.fillStyle = color
    g.fillText(str, x, y)
  }
  const fit = (str: string, max: number, size: number) => {
    g.font = `700 ${size}px ${FONT}`
    if (g.measureText(str).width <= max) return str
    while (str.length > 1 && g.measureText(str + '…').width > max) str = str.slice(0, -1)
    return str + '…'
  }

  const X = 90
  text('w.todo', X, 150, 44, accent, 800)
  text(`${s.label} 회고`, X, 250, 76)

  // big numbers
  const rate = s.total ? Math.round((s.done / s.total) * 100) : 0
  const tiles: [string, string][] = [
    ['완료한 일', `${s.done}개`],
    ['달성률', `${rate}%`],
    ['집중 시간', s.focus ? formatDuration(s.focus) : '0분'],
    ['최장 연속', `${s.bestStreak}일`],
  ]
  tiles.forEach(([k, v], i) => {
    const x = X + (i % 2) * 460
    const y = 380 + Math.floor(i / 2) * 220
    g.fillStyle = 'rgba(255,255,255,0.06)'
    g.beginPath()
    g.roundRect(x - 30, y - 70, 430, 190, 28)
    g.fill()
    text(k, x, y - 10, 34, '#9ca3af', 600)
    text(v, x, y + 75, 72)
  })

  // highlights
  let y = 900
  const line = (k: string, v: string, color = '#fff') => {
    text(k, X, y, 32, '#9ca3af', 600)
    text(fit(v, W - X * 2, 46), X, y + 62, 46, color)
    y += 150
  }
  if (s.topCategory) line('가장 많이 한 카테고리', `${s.topCategory.cat.name} · ${s.topCategory.done}개`, accent)
  if (s.topTitle) line('가장 자주 한 일', `${s.topTitle.title} · ${s.topTitle.done}번`)
  if (s.topFocus) line('가장 오래 집중한 일', `${s.topFocus.title} · ${formatDuration(s.topFocus.focus_seconds)}`)
}
