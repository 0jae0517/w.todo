import { useEffect, useState, type ReactNode } from 'react'
import { setOfficeHidden, spotOf, useOffice, useOfficeHidden, type Officemate, type OfficeStatus } from '../office'
import { useTimer } from '../pomodoro'
import { useMyProfile, type Profile } from '../social'
import { useStore } from '../store'
import Sheet from './Sheet'

/*
 * The pixel office, drawn as an SVG of 1-unit squares so it stays crisp at any size.
 * Desks on the left (one per person focusing), a lounge with a sofa on the right.
 */

const W = 150
const COLS = 3
const CELL_W = 30
const CELL_H = 40
const DESK_TOP = 36
const LOUNGE_X = 100

// ---- sprites ('.' is transparent) ----

const TODO = [
  '...K.K.K......',
  '....K.K...YY..',
  '...KKKKKKKYY..',
  '..KBBBBBBBBK..',
  '.KBBBBBBBBBBK.',
  '.KBBEBBBBEBBK.',
  '.KBBEBBBBEBBK.',
  '.KPBBBMMBBBPK.',
  '.KBBBBBBBBBBK.',
  '..KBBBBBBBBK..',
  '...KKKKKKKK...',
  '....K....K....',
]
// focusing: a pink headband and narrowed eyes, like 토도's focus face
const TODO_FOCUS = TODO.map((r, i) => (i === 3 ? '..KPPPPPPPPK..' : i === 5 ? '.KBBBBBBBBBBK.' : i === 6 ? '.KBEEBBBBEEBK.' : r))

// the chair's back, peeking over the desk
const CHAIR = ['..GGGGGGGG..', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.', '.GHHHHHHHHG.']

const PLANT = ['..L.L...', '.LLLLL..', 'LLDLLLL.', '.LLLDLL.', '..LLL...', '.PPPPP..', '.PQQQP..', '..PPP...']

const BASE: Record<string, string> = {
  K: '#3b3f4c',
  Y: '#ffd43b',
  P: '#f19aa1',
  E: '#3b3f4c',
  M: '#e0707a',
  G: '#8a7a9e',
  H: '#b3a6c4',
  L: '#5fbf7f',
  D: '#3f9a5f',
  Q: '#b9744f',
}

const TINTS = ['#ffffff', '#ffd6e0', '#c8f0d8', '#cfe6ff', '#fff1b8', '#e3d4ff', '#ffdcc2']

function tintOf(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return TINTS[Math.abs(h) % TINTS.length]
}

/** One sprite as merged runs of squares. */
function Pix({ x, y, rows, colors }: { x: number; y: number; rows: string[]; colors: Record<string, string> }) {
  const out: ReactNode[] = []
  rows.forEach((row, j) => {
    let i = 0
    while (i < row.length) {
      const c = row[i]
      let n = 1
      while (row[i + n] === c) n++
      if (c !== '.') out.push(<rect key={`${j}-${i}`} x={x + i} y={y + j} width={n} height={1} fill={colors[c] ?? c} />)
      i += n
    }
  })
  return <g>{out}</g>
}

const Todo = ({ x, y, id, focus }: { x: number; y: number; id: string; focus?: boolean }) => (
  <g className="office-char">
    <Pix x={x} y={y} rows={focus ? TODO_FOCUS : TODO} colors={{ ...BASE, B: tintOf(id) }} />
  </g>
)

function Desk({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      {/* monitor, seen from the side */}
      <rect x={x + 2} y={y + 9} width={8} height={7} fill="#4a4f5c" />
      <rect x={x + 3} y={y + 10} width={6} height={5} fill={on ? '#8fd8ff' : '#2d313b'} />
      {on && <rect x={x + 4} y={y + 11} width={3} height={1} fill="#e8f7ff" />}
      <rect x={x + 5} y={y + 16} width={2} height={1} fill="#4a4f5c" />
      {/* desk */}
      <rect x={x + 1} y={y + 17} width={28} height={3} fill="#c98f5a" />
      <rect x={x + 1} y={y + 20} width={28} height={8} fill="#a8703f" />
      <rect x={x + 6} y={y + 22} width={18} height={5} fill="#f6ead8" />
      {/* a mug */}
      <rect x={x + 24} y={y + 14} width={3} height={3} fill="#ffffff" />
      <rect x={x + 27} y={y + 15} width={1} height={1} fill="#ffffff" />
    </g>
  )
}

interface Placed {
  mate: Officemate
  x: number
  y: number
  spot: 'desk' | 'sofa' | 'lounge'
}

function layout(here: Officemate[], now: number) {
  const desk = here.filter((m) => spotOf(m.status, now) === 'desk')
  const sofa = here.filter((m) => spotOf(m.status, now) === 'sofa')
  const lounge = here.filter((m) => spotOf(m.status, now) === 'lounge')
  const deskRows = Math.max(2, Math.ceil(desk.length / COLS))
  const H = DESK_TOP + deskRows * CELL_H + 4
  const sofaY = H - 30
  const placed: Placed[] = []
  desk.forEach((mate, i) => {
    const cx = 3 + (i % COLS) * CELL_W
    const cy = DESK_TOP + Math.floor(i / COLS) * CELL_H
    placed.push({ mate, x: cx + 10, y: cy + 4, spot: 'desk' })
  })
  // three on the sofa; more breakers stand in the lounge
  sofa.slice(0, 3).forEach((mate, i) => placed.push({ mate, x: LOUNGE_X + 2 + i * 15, y: sofaY + 3, spot: 'sofa' }))
  const standing = [...sofa.slice(3), ...lounge]
  const perRow = 3
  const rowsFit = Math.max(1, Math.floor((sofaY - 52) / 22))
  standing.forEach((mate, i) => {
    const row = Math.floor(i / perRow) % rowsFit
    const col = i % perRow
    // a slight stagger so a crowd still reads as people
    placed.push({ mate, x: LOUNGE_X + 2 + col * 15 + (row % 2) * 2, y: 46 + row * 22, spot: 'lounge' })
  })
  return { placed, H, sofaY, deskRows }
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const left = (s: OfficeStatus | undefined, now: number) => (s?.ends_at ? Date.parse(s.ends_at) - now : 0)

const nameOf = (p: Profile) => p.name || p.username

export default function Office({ onOpenFriend }: { onOpenFriend: (p: Profile) => void }) {
  const { profile } = useMyProfile()
  const { mates, err } = useOffice(profile)
  const timer = useTimer()
  const { todos } = useStore()
  const hidden = useOfficeHidden()
  const [now, setNow] = useState(Date.now)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (err) return <p className="empty">{err}</p>
  if (!mates || !profile) return <p className="empty">오피스 여는 중…</p>

  // I'm shown from this device's timer, so it's right even before the server catches up
  const mine: OfficeStatus = {
    user_id: profile.id,
    phase: timer.endsAt ? timer.phase : 'idle',
    todo_id: timer.endsAt ? timer.todoId : null,
    ends_at: timer.endsAt ? new Date(timer.endsAt).toISOString() : null,
    seen_at: new Date(now).toISOString(),
  }
  const myTitle = mine.todo_id ? (todos.find((t) => t.id === mine.todo_id)?.title ?? null) : null
  const all = mates.map((m) => (m.profile.id === profile.id ? { ...m, status: mine, todoTitle: myTitle } : m))
  const away = all.filter((m) => spotOf(m.status, now) === 'away')
  const selected = all.find((m) => m.profile.id === open)

  return (
    <div className="office">
      <OfficeRoom all={all} meId={profile.id} now={now} onTap={setOpen} />
      {all.length === 1 && <p className="office-note">서로 팔로우하는 친구가 생기면 여기서 같이 일해요.</p>}
      {away.length > 0 && (
        <div className="office-away">
          <span className="office-away-label">자리 비움</span>
          {away.map((m) => (
            <button key={m.profile.id} className="office-away-chip" onClick={() => setOpen(m.profile.id)}>
              {m.profile.id === profile.id ? '나' : nameOf(m.profile)}
            </button>
          ))}
        </div>
      )}

      <label className="office-toggle">
        <input type="checkbox" checked={!hidden} onChange={(e) => setOfficeHidden(!e.target.checked)} />
        친구들에게 내 모습 보이기
      </label>

      {selected && (
        <MateSheet
          mate={selected}
          isMe={selected.profile.id === profile.id}
          now={now}
          hidden={hidden}
          onClose={() => setOpen(null)}
          onOpenFriend={() => {
            setOpen(null)
            onOpenFriend(selected.profile)
          }}
        />
      )}
    </div>
  )
}

function MateSheet({ mate, isMe, now, hidden, onClose, onOpenFriend }: { mate: Officemate; isMe: boolean; now: number; hidden: boolean; onClose: () => void; onOpenFriend: () => void }) {
  const spot = spotOf(mate.status, now)
  const ms = left(mate.status, now)
  const status =
    spot === 'desk'
      ? `${mate.todoTitle ? `「${mate.todoTitle}」` : '할 일'}에 집중하고 있어요 · ${clock(ms)} 남음`
      : spot === 'sofa'
        ? `쉬는 중이에요 · ${clock(ms)} 남음`
        : spot === 'lounge'
          ? '오피스에 있어요'
          : '자리에 없어요'
  return (
    <Sheet title={isMe ? '나' : nameOf(mate.profile)} onClose={onClose}>
      {!isMe && <p className="sheet-sub">@{mate.profile.username}</p>}
      <p className="office-status-line">{status}</p>
      {isMe && hidden && <p className="sheet-sub">지금은 친구들에게 내 모습이 보이지 않아요.</p>}
      {!isMe && (
        <button className="primary" onClick={onOpenFriend}>
          할 일 보고 응원하기
        </button>
      )}
    </Sheet>
  )
}

/** The room itself: who sits where, drawn from statuses. */
export function OfficeRoom({ all, meId, now, onTap }: { all: Officemate[]; meId: string; now: number; onTap: (id: string) => void }) {
  const here = all.filter((m) => spotOf(m.status, now) !== 'away')
  const { placed, H, sofaY, deskRows } = layout(here, now)

  return (
    <div className="office-room" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden="true">
        {/* wall */}
        <rect x={0} y={0} width={W} height={30} fill="#f3e9dc" />
        <rect x={0} y={28} width={W} height={2} fill="#d9c7b0" />
        {[8, 50].map((wx) => (
          <g key={wx}>
            <rect x={wx} y={6} width={30} height={16} fill="#8c6a4a" />
            <rect x={wx + 2} y={8} width={12} height={12} fill="#bfe6ff" />
            <rect x={wx + 16} y={8} width={12} height={12} fill="#bfe6ff" />
            <rect x={wx + 4} y={10} width={4} height={2} fill="#ffffff" />
          </g>
        ))}
        {/* clock */}
        <rect x={89} y={8} width={9} height={9} fill="#3b3f4c" />
        <rect x={90} y={9} width={7} height={7} fill="#ffffff" />
        <rect x={93} y={10} width={1} height={3} fill="#3b3f4c" />
        <rect x={93} y={12} width={2} height={1} fill="#3b3f4c" />
        {/* floor */}
        <rect x={0} y={30} width={W} height={H - 30} fill="#ead8bb" />
        {Array.from({ length: Math.ceil((H - 30) / 8) }, (_, i) => (
          <rect key={i} x={0} y={37 + i * 8} width={W} height={1} fill="#e0caa6" />
        ))}
        {/* lounge rug, coffee counter, plant */}
        <rect x={LOUNGE_X} y={42} width={48} height={sofaY - 44} fill="#f6cfd3" />
        <rect x={LOUNGE_X + 2} y={44} width={44} height={sofaY - 48} fill="#f9dde0" />
        <rect x={118} y={18} width={30} height={14} fill="#a8703f" />
        <rect x={118} y={18} width={30} height={2} fill="#c98f5a" />
        <rect x={122} y={8} width={9} height={10} fill="#5b6170" />
        <rect x={124} y={10} width={5} height={3} fill="#2d313b" />
        <rect x={125} y={15} width={3} height={3} fill="#ffffff" />
        <rect x={136} y={13} width={4} height={5} fill="#ffffff" />
        <Pix x={102} y={22} rows={PLANT} colors={BASE} />

        {/* desks, empty ones too */}
        {Array.from({ length: deskRows * COLS }, (_, i) => {
          const cx = 3 + (i % COLS) * CELL_W
          const cy = DESK_TOP + Math.floor(i / COLS) * CELL_H
          const p = placed.filter((q) => q.spot === 'desk')[i]
          return (
            <g key={i}>
              <Pix x={cx + 11} y={cy + 9} rows={CHAIR} colors={BASE} />
              {p && <Todo x={p.x} y={p.y} id={p.mate.profile.id} focus />}
              <Desk x={cx} y={cy} on={!!p} />
            </g>
          )
        })}

        {/* sofa: back, sitters, front */}
        <rect x={LOUNGE_X + 1} y={sofaY} width={46} height={10} fill="#6f86d6" />
        {placed
          .filter((p) => p.spot === 'sofa')
          .map((p) => (
            <Todo key={p.mate.profile.id} x={p.x} y={p.y} id={p.mate.profile.id} />
          ))}
        <rect x={LOUNGE_X - 1} y={sofaY + 13} width={50} height={9} fill="#5e6ad2" />
        <rect x={LOUNGE_X - 2} y={sofaY + 6} width={4} height={16} fill="#4b55b0" />
        <rect x={LOUNGE_X + 46} y={sofaY + 6} width={4} height={16} fill="#4b55b0" />
        {placed
          .filter((p) => p.spot === 'lounge')
          .map((p) => (
            <Todo key={p.mate.profile.id} x={p.x} y={p.y} id={p.mate.profile.id} />
          ))}
      </svg>

      {/* text and taps sit on top as HTML, so Korean stays sharp */}
      {placed.map((p) => {
        const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
        const ms = left(p.mate.status, now)
        const isMe = p.mate.profile.id === meId
        return (
          <div key={p.mate.profile.id}>
            {p.spot !== 'lounge' && (
              <span className={`office-bubble ${p.spot}`} style={pct(p.x + 7, p.y - 1)}>
                {p.spot === 'desk' && <span className="office-bubble-title">{p.mate.todoTitle ?? '집중 중'}</span>}
                {p.spot === 'sofa' && <span className="office-bubble-title">휴식</span>}
                <b>{clock(ms)}</b>
              </span>
            )}
            <span className={`office-name ${p.spot}${isMe ? ' me' : ''}`} style={p.spot === 'desk' ? pct(p.x + 5, p.y + 20) : pct(p.x + 7, p.y + (p.spot === 'sofa' ? 20 : 13))}>
              {isMe ? '나' : nameOf(p.mate.profile)}
            </span>
            <button
              className="office-hit"
              style={{ ...pct(p.x - 1, p.y - 1), width: `${(16 / W) * 100}%`, height: `${(14 / H) * 100}%` }}
              onClick={() => onTap(p.mate.profile.id)}
              aria-label={`${nameOf(p.mate.profile)} 보기`}
            />
          </div>
        )
      })}
      {!placed.some((p) => p.spot === 'desk') && <span className="office-hint">뽀모도로를 시작하면 책상에 앉아요</span>}
    </div>
  )
}
