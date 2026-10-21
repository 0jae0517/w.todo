/** 토도, the w.todo character: a round body with a "w" tuft and the logo's yellow dot as a hair pin. */
export type Mood = 'base' | 'sleep' | 'happy' | 'focus'

const PINK = '#f19aa1'
const YELLOW = '#ffd43b'

export default function Mascot({ mood = 'base', size = 96 }: { mood?: Mood; size?: number }) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="-70 -80 140 140" aria-hidden="true">
      <g className="ink" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -40 C24 -41 40 -22 39 2 C38 26 22 40 -1 40 C-24 40 -39 25 -39 1 C-39 -23 -23 -39 0 -40 Z" className="body" />
        <path d="M-12 -40 l4 -12 l5 9 l5 -9 l4 12" strokeWidth="2.6" />
        {EYES[mood]}
        {MOUTH[mood]}
        <circle cx="-23" cy="7" r="4.5" fill={PINK} stroke="none" opacity=".75" />
        <circle cx="23" cy="7" r="4.5" fill={PINK} stroke="none" opacity=".75" />
        <circle cx="30" cy="-28" r="4" fill={YELLOW} stroke="none" />
        {mood === 'happy' ? <path d="M-36 6 q-14 -14 -16 -30 M36 6 q14 -14 16 -30" /> : <path d="M-36 12 q-10 8 -14 18 M36 12 q10 8 14 18" />}
        <path d="M-12 40 v10 M12 40 v10" />
        {EXTRA[mood]}
      </g>
    </svg>
  )
}

const dot = (x: number, y: number) => <circle cx={x} cy={y} r="2.6" fill="currentColor" />

const EYES: Record<Mood, React.ReactNode> = {
  base: <>{dot(-14, -4)}{dot(14, -4)}</>,
  sleep: <path d="M-19 -4 q5 4 10 0 M9 -4 q5 4 10 0" />,
  happy: <path d="M-20 -8 l7 5 l-7 5 M20 -8 l-7 5 l7 5" />,
  focus: <><path d="M-20 -8 l11 3 M20 -8 l-11 3" />{dot(-13, 0)}{dot(13, 0)}</>,
}

const MOUTH: Record<Mood, React.ReactNode> = {
  base: <path d="M-6 10 q6 6 12 0" />,
  sleep: <path d="M-4 12 q4 2 8 0" />,
  happy: <path d="M-9 8 q9 14 18 0 Z" />,
  focus: <path d="M-6 12 h12" />,
}

const EXTRA: Record<Mood, React.ReactNode> = {
  base: null,
  sleep: (
    <text x="30" y="-40" fontSize="20" fill="currentColor" stroke="none">
      z<tspan x="44" y="-54" fontSize="15">z</tspan>
    </text>
  ),
  happy: (
    <>
      <path d="M-50 -48 l4 6 M52 -46 l-5 6 M-58 -20 l6 2 M60 -18 l-6 2" stroke={YELLOW} />
      <path d="M-44 -60 l3 3 M48 -62 l-3 3" stroke={PINK} />
    </>
  ),
  focus: (
    <>
      <path d="M-37 -18 q37 -12 74 0" stroke={PINK} strokeWidth="5" />
      <path d="M37 -18 l12 -6 M37 -18 l13 4" stroke={PINK} strokeWidth="3" />
    </>
  ),
}

/** Chalk texture used by the chalkboard theme (rendered once, referenced from CSS). */
export function ChalkFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="3.5" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.55" result="a" />
        <feComposite in="d" in2="a" operator="in" />
      </filter>
    </svg>
  )
}
