import { useEffect, useMemo, useState } from 'react'
import { WEEKDAYS, addDays, fromKey, todayKey, weekOf } from '../date'
import { formatDuration } from '../pomodoro'
import { listFollowers, listFollowing, useMyProfile } from '../social'
import { useStore } from '../store'
import { supabase } from '../supabase'
import { signOut, syncNow, useSync } from '../sync'
import type { Category, Todo } from '../types'
import { LoginPanel, PasswordForm, STATUS_LABEL } from './Account'
import FocusPattern from './FocusPattern'
import { ProfileForm } from './Friends'
import Heatmap from './Heatmap'
import Recap, { lastMonthLabel, recapReady } from './Recap'
import Sheet from './Sheet'
import Mascot from './Mascot'
import { setTheme, useTheme, type Theme } from '../theme'

type View = 'summary' | 'grass' | 'focus' | 'recap'
const VIEWS: [View, string][] = [
  ['summary', '요약'],
  ['grass', '잔디'],
  ['focus', '집중'],
  ['recap', '회고'],
]
const VIEW_KEY = 'todo-app:me-view'

export default function Me({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const { sessions } = useStore()
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as View) || 'summary'
    } catch {
      return 'summary'
    }
  })
  const pick = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // not remembered, that's fine
    }
  }
  const ready = recapReady(todos, categories)

  return (
    <div className="me">
      <AccountRow />
      {ready && view !== 'recap' && (
        <button className="recap-open fresh" onClick={() => pick('recap')}>
          <span>🎉 {lastMonthLabel()} 회고가 준비됐어요</span>
          <span>›</span>
        </button>
      )}
      <ThemePicker />
      <div className="seg" role="tablist">
        {VIEWS.map(([v, label]) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => pick(v)}>
            {label}
          </button>
        ))}
      </div>
      <section className="card">
        {view === 'summary' && <Summary todos={todos} categories={categories} />}
        {view === 'grass' && (
          <>
            <Heatmap todos={todos} categories={categories} />
            <PerCategory todos={todos} categories={categories} />
          </>
        )}
        {view === 'focus' && (
          <>
            <FocusPattern sessions={sessions} />
            <TopFocus todos={todos} />
          </>
        )}
        {view === 'recap' && <Recap todos={todos} categories={categories} />}
      </section>
    </div>
  )
}

/** One line at the top: who I am (or a way to sign in), with settings behind a tap. */
function AccountRow() {
  const { session, status } = useSync()
  const { profile, reload } = useMyProfile()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null)

  useEffect(() => {
    if (!profile) return
    Promise.all([listFollowers(), listFollowing()])
      .then(([a, b]) => setCounts({ followers: a.length, following: b.length }))
      .catch(() => {})
  }, [profile])

  if (!supabase) return <p className="sheet-sub">동기화 서버가 연결되지 않아 이 기기에만 저장하고 있어요.</p>

  const name = profile ? profile.name || profile.username : session ? '프로필 만들기' : '로그인'
  return (
    <>
      <button className="account-row" onClick={() => setOpen(true)}>
        <span className="avatar big">{profile ? name.slice(0, 1).toUpperCase() : '👤'}</span>
        <span className="profile-text">
          <strong>{name}</strong>
          {profile ? (
            <span className="profile-counts">
              @{profile.username}
              {counts && (
                <>
                  {' · '}팔로워 <b>{counts.followers}</b> · 팔로잉 <b>{counts.following}</b>
                </>
              )}
            </span>
          ) : (
            <span className="profile-counts">{session ? '친구가 아이디로 나를 찾을 수 있어요' : '로그인하면 휴대폰과 컴퓨터가 동기화돼요'}</span>
          )}
        </span>
        {session && <span className={`dot s-${status}`} title={STATUS_LABEL[status]} />}
        <span className="muted">›</span>
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          {!session ? (
            <>
              <h2 className="sheet-title">로그인</h2>
              <LoginPanel />
            </>
          ) : (
            <Settings
              onSaved={() => {
                reload()
                setOpen(false)
              }}
            />
          )}
        </Sheet>
      )}
    </>
  )
}

function Settings({ onSaved }: { onSaved: () => void }) {
  const { status, session, error } = useSync()
  const { profile } = useMyProfile()
  return (
    <div className="settings">
      {profile !== undefined && <ProfileForm initial={profile ?? undefined} onSaved={onSaved} />}
      <h3 className="sub-title">계정</h3>
      <p className="sheet-sub">{session?.user.email ?? '이메일 없음'}</p>
      <p className={`status-line s-${status}`}>{STATUS_LABEL[status]}</p>
      {error && status === 'error' && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => syncNow()}>지금 동기화</button>
        <button onClick={() => signOut()}>로그아웃</button>
      </div>
      <PasswordForm />
    </div>
  )
}

function Summary({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const today = todayKey()
  const r = useMemo(() => {
    const byDay = new Map<string, { total: number; done: number; focus: number }>()
    for (const t of todos) {
      const d = byDay.get(t.date) ?? { total: 0, done: 0, focus: 0 }
      d.total++
      if (t.done) d.done++
      d.focus += t.focus_seconds
      byDay.set(t.date, d)
    }
    const doneTotal = todos.filter((t) => t.done).length
    const focusTotal = todos.reduce((s, t) => s + t.focus_seconds, 0)

    const week = weekOf(today).map((k) => byDay.get(k) ?? { total: 0, done: 0, focus: 0 })
    const weekTotal = week.reduce((s, d) => s + d.total, 0)
    const weekDone = week.reduce((s, d) => s + d.done, 0)

    // consecutive days with at least one finished todo, counting back from today
    // (today not finished yet doesn't break the streak)
    let streak = 0
    let day = (byDay.get(today)?.done ?? 0) > 0 ? today : addDays(today, -1)
    while ((byDay.get(day)?.done ?? 0) > 0) {
      streak++
      day = addDays(day, -1)
    }

    const recent = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((k) => ({ key: k, ...(byDay.get(k) ?? { total: 0, done: 0, focus: 0 }) }))

    return { doneTotal, focusTotal, weekTotal, weekDone, streak, recent }
  }, [todos, categories, today])

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <span>완료한 일</span>
          <strong>{r.doneTotal}개</strong>
        </div>
        <div className="tile">
          <span>이번 주 달성률</span>
          <strong>{r.weekTotal ? Math.round((r.weekDone / r.weekTotal) * 100) : 0}%</strong>
          <small>{r.weekDone} / {r.weekTotal}</small>
        </div>
        <div className="tile">
          <span>총 집중 시간</span>
          <strong>{r.focusTotal ? formatDuration(r.focusTotal) : '0분'}</strong>
        </div>
        <div className="tile">
          <span>연속 달성</span>
          <strong>{r.streak}일</strong>
        </div>
      </div>

      <h3 className="sub-title">최근 7일</h3>
      <ul className="rows">
        {r.recent.map((d) => (
          <li key={d.key}>
            <span>{dateLabel(d.key)}</span>
            <span className="muted">{d.focus ? `🍅 ${formatDuration(d.focus)}` : ''}</span>
            <span>{d.total ? `${d.done} / ${d.total}` : '-'}</span>
          </li>
        ))}
      </ul>

    </>
  )
}

function PerCategory({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const perCat = useMemo(
    () =>
      categories
        .map((c) => {
          const list = todos.filter((t) => t.category_id === c.id)
          return { cat: c, done: list.filter((t) => t.done).length, total: list.length, focus: list.reduce((s, t) => s + t.focus_seconds, 0) }
        })
        .filter((x) => x.total > 0),
    [todos, categories],
  )
  if (!perCat.length) return null
  return (
    <>
      <h3 className="sub-title">카테고리별</h3>
      <ul className="rows">
        {perCat.map(({ cat, done, total, focus }) => (
          <li key={cat.id}>
            <span style={{ color: cat.color, fontWeight: 700 }}>{cat.name}</span>
            <span className="muted">{focus ? `🍅 ${formatDuration(focus)}` : ''}</span>
            <span>{done} / {total}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function TopFocus({ todos }: { todos: Todo[] }) {
  const top = useMemo(
    () =>
      todos
        .filter((t) => t.focus_seconds > 0)
        .sort((a, b) => b.focus_seconds - a.focus_seconds)
        .slice(0, 5),
    [todos],
  )
  if (!top.length) return null
  return (
    <>
      <h3 className="sub-title">가장 오래 집중한 일</h3>
      <ul className="rows">
        {top.map((t) => (
          <li key={t.id}>
            <span className="ellipsis">{t.title}</span>
            <span className="muted">{dateLabel(t.date)}</span>
            <span>🍅 {formatDuration(t.focus_seconds)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function dateLabel(k: string) {
  const today = todayKey()
  if (k === today) return '오늘'
  if (k === addDays(today, -1)) return '어제'
  const d = fromKey(k)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

const THEMES: [Theme, string][] = [
  ['basic', '기본'],
  ['chalk', '칠판'],
]

function ThemePicker() {
  const theme = useTheme()
  return (
    <div className="theme-picker">
      <span className="theme-label">테마</span>
      {THEMES.map(([t, label]) => (
        <button key={t} className={`theme-opt t-${t} ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)} aria-pressed={theme === t}>
          <Mascot size={28} mood={theme === t ? 'happy' : 'base'} />
          {label}
        </button>
      ))}
    </div>
  )
}
