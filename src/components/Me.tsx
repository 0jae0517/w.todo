import { useEffect, useMemo, useState } from 'react'
import { WEEKDAYS, addDays, fromKey, todayKey, weekOf } from '../date'
import { formatDuration } from '../pomodoro'
import { listFollowers, listFollowing, useMyProfile } from '../social'
import { supabase } from '../supabase'
import { signOut, syncNow, useSync } from '../sync'
import type { Category, Todo } from '../types'
import { useStore } from '../store'
import { LoginPanel, PasswordForm, STATUS_LABEL } from './Account'
import FocusPattern from './FocusPattern'
import Heatmap from './Heatmap'
import Recap from './Recap'
import { ProfileForm } from './Friends'

export default function Me({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
  const { session } = useSync()
  return (
    <div className="me">
      {!supabase ? (
        <section className="card">
          <p className="sheet-sub">동기화 서버가 연결되지 않아 이 기기에만 저장하고 있어요.</p>
        </section>
      ) : session ? (
        <ProfileCard />
      ) : (
        <section className="card">
          <h2 className="section-title">로그인</h2>
          <LoginPanel />
        </section>
      )}
      <Recap todos={todos} categories={categories} />
      <Records todos={todos} categories={categories} />
      <section className="card">
        <h2 className="section-title">집중 패턴</h2>
        <FocusPattern sessions={useStore().sessions} />
      </section>
      {session && <AccountCard />}
    </div>
  )
}

function ProfileCard() {
  const { profile, reload } = useMyProfile()
  const [editing, setEditing] = useState(false)
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null)

  useEffect(() => {
    if (!profile) return
    Promise.all([listFollowers(), listFollowing()])
      .then(([a, b]) => setCounts({ followers: a.length, following: b.length }))
      .catch(() => {})
  }, [profile])

  if (profile === undefined) return <section className="card"><p className="empty">불러오는 중…</p></section>
  if (profile === null || editing)
    return (
      <section className="card">
        <ProfileForm
          initial={profile ?? undefined}
          onSaved={() => {
            setEditing(false)
            reload()
          }}
        />
      </section>
    )

  return (
    <section className="card profile">
      <span className="avatar big">{(profile.name || profile.username).slice(0, 1).toUpperCase()}</span>
      <div className="profile-text">
        <strong>{profile.name || profile.username}</strong>
        <span className="handle">@{profile.username}</span>
        {counts && (
          <span className="profile-counts">
            팔로워 <b>{counts.followers}</b> · 팔로잉 <b>{counts.following}</b>
          </span>
        )}
      </div>
      <button className="link" onClick={() => setEditing(true)}>수정</button>
    </section>
  )
}

function AccountCard() {
  const { status, session, error } = useSync()
  return (
    <section className="card">
      <h2 className="section-title">계정</h2>
      <p className="sheet-sub">{session?.user.email ?? '이메일 없음'}</p>
      <p className={`status-line s-${status}`}>{STATUS_LABEL[status]}</p>
      {error && status === 'error' && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => syncNow()}>지금 동기화</button>
        <button onClick={() => signOut()}>로그아웃</button>
      </div>
      <PasswordForm />
    </section>
  )
}

function Records({ todos, categories }: { todos: Todo[]; categories: Category[] }) {
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

    const perCat = categories
      .map((c) => {
        const list = todos.filter((t) => t.category_id === c.id)
        return { cat: c, done: list.filter((t) => t.done).length, total: list.length, focus: list.reduce((s, t) => s + t.focus_seconds, 0) }
      })
      .filter((x) => x.total > 0)

    const topFocus = todos
      .filter((t) => t.focus_seconds > 0)
      .sort((a, b) => b.focus_seconds - a.focus_seconds)
      .slice(0, 5)

    return { doneTotal, focusTotal, weekTotal, weekDone, streak, recent, perCat, topFocus }
  }, [todos, categories, today])

  const label = (k: string) => {
    if (k === today) return '오늘'
    if (k === addDays(today, -1)) return '어제'
    const d = fromKey(k)
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
  }

  return (
    <section className="card">
      <h2 className="section-title">기록</h2>
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

      <h3 className="sub-title">잔디</h3>
      <Heatmap todos={todos} categories={categories} />

      <h3 className="sub-title">최근 7일</h3>
      <ul className="rows">
        {r.recent.map((d) => (
          <li key={d.key}>
            <span>{label(d.key)}</span>
            <span className="muted">{d.focus ? `🍅 ${formatDuration(d.focus)}` : ''}</span>
            <span>{d.total ? `${d.done} / ${d.total}` : '-'}</span>
          </li>
        ))}
      </ul>

      {r.perCat.length > 0 && (
        <>
          <h3 className="sub-title">카테고리별</h3>
          <ul className="rows">
            {r.perCat.map(({ cat, done, total, focus }) => (
              <li key={cat.id}>
                <span style={{ color: cat.color, fontWeight: 700 }}>{cat.name}</span>
                <span className="muted">{focus ? `🍅 ${formatDuration(focus)}` : ''}</span>
                <span>{done} / {total}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {r.topFocus.length > 0 && (
        <>
          <h3 className="sub-title">가장 오래 집중한 일</h3>
          <ul className="rows">
            {r.topFocus.map((t) => (
              <li key={t.id}>
                <span className="ellipsis">{t.title}</span>
                <span className="muted">{label(t.date)}</span>
                <span>🍅 {formatDuration(t.focus_seconds)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
