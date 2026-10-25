import { useEffect, useState } from 'react'
import { todayKey } from '../date'
import { PHASE_LABEL, formatDuration, pause, phaseLength, reset, setSettings, setTodo, skip, start, timeLeft, useTimer, type Settings } from '../pomodoro'
import type { Todo } from '../types'
import Mascot from './Mascot'
import { TomatoIcon } from './Icons'

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Pomodoro({ todos }: { todos: Todo[] }) {
  const t = useTimer()
  const [, tick] = useState(0)
  const [editing, setEditing] = useState(false)
  const running = t.endsAt !== null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [running])

  const left = timeLeft(t)
  const total = phaseLength(t.settings, t.phase)
  const progress = 1 - left / total
  const R = 110
  const C = 2 * Math.PI * R
  const today = todayKey()
  const candidates = todos.filter((x) => (x.date === today && !x.done) || x.id === t.todoId)
  const current = todos.find((x) => x.id === t.todoId)

  useEffect(() => {
    document.title = running ? `${fmt(left)} ${PHASE_LABEL[t.phase]}` : 'w.todo'
  })

  return (
    <div className="pomo">
      <h2 className="pomo-task">{current ? current.title : '집중할 일을 골라 주세요'}</h2>
      {current && current.focus_seconds > 0 && (
        <p className="pomo-total">지금까지 {formatDuration(current.focus_seconds)} 집중 · <TomatoIcon /> {current.pomodoros}</p>
      )}
      <Mascot mood={!running ? 'base' : t.phase === 'focus' ? 'focus' : 'sleep'} size={76} />
      <div className="pomo-phases">
        {(['focus', 'short', 'long'] as const).map((p) => (
          <span key={p} className={p === t.phase ? 'on' : ''}>{PHASE_LABEL[p]}</span>
        ))}
      </div>

      <div className={`pomo-ring ph-${t.phase}`}>
        <svg viewBox="0 0 260 260">
          <circle cx="130" cy="130" r={R} className="track" />
          <circle cx="130" cy="130" r={R} className="bar" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        </svg>
        <div className="pomo-time">
          <strong>{fmt(left)}</strong>
          <span>{t.round} / {t.settings.longEvery}</span>
        </div>
      </div>

      <div className="pomo-controls">
        <button onClick={reset} aria-label="처음부터">↺</button>
        <button className="primary big" onClick={running ? pause : start}>{running ? '일시정지' : '시작'}</button>
        <button onClick={skip} aria-label="건너뛰기">⏭</button>
      </div>

      <label className="field">
        <span>집중할 일</span>
        <select value={t.todoId ?? ''} onChange={(e) => setTodo(e.target.value || null)}>
          <option value="">선택 안 함</option>
          {candidates.map((x) => (
            <option key={x.id} value={x.id}>{x.title}{x.date !== today ? ` (${x.date.slice(5).replace('-', '/')})` : ''}</option>
          ))}
        </select>
      </label>

      <p className="sheet-sub">오늘 집중 {t.history[today] ?? 0}회</p>

      <button className="link" onClick={() => setEditing(!editing)}>시간 설정 {editing ? '▴' : '▾'}</button>
      {editing && (
        <div className="pomo-settings">
          {([['focus', '집중(분)'], ['short', '짧은 휴식(분)'], ['long', '긴 휴식(분)'], ['longEvery', '긴 휴식 간격(회)']] as [keyof Settings, string][]).map(([k, label]) => (
            <label key={k} className="field">
              <span>{label}</span>
              <input
                type="number"
                min={1}
                max={180}
                value={t.settings[k]}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value))
                  if (v >= 1 && v <= 180) setSettings({ [k]: v })
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
