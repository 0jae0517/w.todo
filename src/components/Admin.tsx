import { useEffect, useState } from 'react'
import {
  REPORT_REASONS,
  adminStats,
  adminUsers,
  allAnnouncements,
  allTemplates,
  deleteAnnouncement,
  deleteUser,
  isBanned,
  listReports,
  saveAnnouncement,
  sendReport,
  setBan,
  setReportStatus,
  type AdminStats,
  type AdminUser,
  type Announcement,
  type Report,
  type ReportReason,
  type ReportStatus,
  type ReportTarget,
} from '../admin'
import { deleteTemplate, setListed, type Template } from '../templates'
import { CloseIcon } from './Icons'
import Sheet from './Sheet'
import { TemplateView } from './Templates'

type View = 'stats' | 'users' | 'templates' | 'reports' | 'notices'
const VIEWS: [View, string][] = [
  ['stats', '현황'],
  ['users', '사용자'],
  ['templates', '템플릿'],
  ['reports', '신고'],
  ['notices', '공지'],
]

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const fmtDate = (s: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`
}
const fmtDateTime = (s: string) => {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const PROVIDER: Record<string, string> = { email: '이메일', google: '구글', kakao: '카카오' }

/** 내 정보 → 관리자. Only shown to admins, and every call is checked again on the server. */
export default function AdminSheet({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('stats')
  return (
    <Sheet onClose={onClose} title="관리자">
      <div className="admin">
        <div className="seg" role="tablist">
          {VIEWS.map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        {view === 'stats' && <Stats onOpenReports={() => setView('reports')} />}
        {view === 'users' && <Users />}
        {view === 'templates' && <Templates />}
        {view === 'reports' && <Reports />}
        {view === 'notices' && <Notices />}
      </div>
    </Sheet>
  )
}

// ---- 현황 ----

function Stats({ onOpenReports }: { onOpenReports: () => void }) {
  const [s, setS] = useState<AdminStats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    adminStats().then(setS).catch((e) => setErr(errText(e)))
  }, [])
  if (err) return <p className="error">{err}</p>
  if (!s) return <p className="empty">불러오는 중…</p>
  const max = Math.max(1, ...s.signups.map((d) => d.count))
  return (
    <>
      {s.open_reports > 0 && (
        <button className="admin-alert" onClick={onOpenReports}>
          처리 안 한 신고가 {s.open_reports}건 있어요
        </button>
      )}
      <div className="tiles">
        <div className="tile">
          <span>전체 가입자</span>
          <strong>{s.users}명</strong>
          <small>프로필 만든 사람 {s.profiles}명</small>
        </div>
        <div className="tile">
          <span>새 가입자</span>
          <strong>{s.new_today}명</strong>
          <small>오늘 · 7일 {s.new_7d} · 30일 {s.new_30d}</small>
        </div>
        <div className="tile">
          <span>활동한 사람</span>
          <strong>{s.active_1d}명</strong>
          <small>하루 · 7일 {s.active_7d} · 30일 {s.active_30d}</small>
        </div>
        <div className="tile">
          <span>할 일</span>
          <strong>{s.todos.toLocaleString()}개</strong>
          <small>완료 {s.todos_done.toLocaleString()}개</small>
        </div>
        <div className="tile">
          <span>총 집중 시간</span>
          <strong>{s.focus_hours.toLocaleString()}시간</strong>
        </div>
        <div className="tile">
          <span>템플릿</span>
          <strong>{s.templates}개</strong>
        </div>
      </div>
      <h3 className="sub-title">최근 14일 가입자</h3>
      <div className="admin-bars">
        {s.signups.map((d) => (
          <div key={d.day} className="admin-bar" title={`${d.day} ${d.count}명`}>
            <span className="admin-bar-n">{d.count || ''}</span>
            <i style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="admin-bar-d">{Number(d.day.slice(8))}</span>
          </div>
        ))}
      </div>
      <p className="sheet-sub">활동한 사람은 그 기간에 할 일을 하나라도 바꾼 사람이에요.</p>
    </>
  )
}

// ---- 사용자 ----

function Users() {
  const [q, setQ] = useState('')
  const [list, setList] = useState<AdminUser[] | null>(null)
  const [more, setMore] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const h = setTimeout(
      () =>
        adminUsers(q)
          .then((rows) => {
            setList(rows)
            setMore(rows.length === 50)
          })
          .catch((e) => setErr(errText(e))),
      q ? 300 : 0,
    )
    return () => clearTimeout(h)
  }, [q, tick])

  const loadMore = async () => {
    const rows = await adminUsers(q, list?.length ?? 0)
    setList([...(list ?? []), ...rows])
    setMore(rows.length === 50)
  }

  return (
    <>
      <input className="search" placeholder="이메일, 아이디, 이름으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      {list === null ? (
        <p className="empty">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="empty">찾는 사용자가 없어요.</p>
      ) : (
        <ul className="admin-list">
          {list.map((u) => (
            <li key={u.id}>
              <button className="admin-item" onClick={() => setOpen(open === u.id ? null : u.id)}>
                <span className="admin-item-main">
                  <strong>
                    {u.name || u.username || '(프로필 없음)'}
                    {u.username && <span className="muted"> @{u.username}</span>}
                  </strong>
                  <span className="muted">{u.email ?? '이메일 없음'}</span>
                </span>
                <span className="admin-badges">
                  {u.admin && <span className="badge">관리자</span>}
                  {isBanned(u) && <span className="badge warn">정지</span>}
                </span>
              </button>
              {open === u.id && <UserDetail user={u} onChanged={() => setTick(tick + 1)} />}
            </li>
          ))}
        </ul>
      )}
      {more && (
        <button className="link" onClick={loadMore}>
          더 보기
        </button>
      )}
    </>
  )
}

function UserDetail({ user: u, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const who = u.name || u.username || u.email || '이 사용자'
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }
  const banned = isBanned(u)
  return (
    <div className="admin-detail">
      <dl>
        <dt>가입</dt>
        <dd>
          {fmtDate(u.created_at)} · {PROVIDER[u.provider] ?? u.provider}
        </dd>
        <dt>마지막 로그인</dt>
        <dd>{fmtDate(u.last_sign_in_at)}</dd>
        <dt>할 일</dt>
        <dd>{u.todos}개</dd>
        {banned && (
          <>
            <dt>정지</dt>
            <dd>{new Date(u.banned_until!).getFullYear() > new Date().getFullYear() + 50 ? '영구' : `${fmtDate(u.banned_until)}까지`}</dd>
          </>
        )}
      </dl>
      {u.admin ? (
        <p className="sheet-sub">관리자 계정은 여기서 정지하거나 삭제할 수 없어요.</p>
      ) : (
        <div className="actions">
          {banned ? (
            <button disabled={busy} onClick={() => run(() => setBan(u.id, null))}>
              정지 풀기
            </button>
          ) : (
            <BanButtons who={who} busy={busy} onBan={(days) => run(() => setBan(u.id, days))} />
          )}
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (!confirm(`${who} 계정을 삭제할까요?\n할 일, 카테고리, 템플릿 등 모든 데이터가 지워지고 되돌릴 수 없어요.`)) return
              run(() => deleteUser(u.id))
            }}
          >
            계정 삭제
          </button>
        </div>
      )}
      {err && <p className="error">{err}</p>}
    </div>
  )
}

function BanButtons({ who, busy, onBan }: { who: string; busy: boolean; onBan: (days: number) => void }) {
  const ban = (days: number) => {
    const label = days ? `${days}일 동안` : '영구히'
    if (confirm(`${who} 계정을 ${label} 정지할까요?\n정지되면 로그인할 수 없고, 이미 로그인한 기기도 1시간 안에 로그아웃돼요.`)) onBan(days)
  }
  return (
    <>
      <button disabled={busy} onClick={() => ban(7)}>7일 정지</button>
      <button disabled={busy} onClick={() => ban(30)}>30일 정지</button>
      <button disabled={busy} onClick={() => ban(0)}>영구 정지</button>
    </>
  )
}

// ---- 템플릿 ----

function Templates() {
  const [q, setQ] = useState('')
  const [list, setList] = useState<Template[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const h = setTimeout(
      () =>
        allTemplates(q)
          .then(setList)
          .catch((e) => setErr(errText(e))),
      q ? 300 : 0,
    )
    return () => clearTimeout(h)
  }, [q, tick])

  const act = async (fn: () => Promise<void>) => {
    setErr(null)
    try {
      await fn()
      setTick((n) => n + 1)
    } catch (e) {
      setErr(errText(e))
    }
  }

  return (
    <>
      <input className="search" placeholder="템플릿 제목으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      {list === null ? (
        <p className="empty">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="empty">템플릿이 없어요.</p>
      ) : (
        <ul className="admin-list">
          {list.map((t) => (
            <li key={t.id}>
              <div className="admin-item">
                <button className="admin-item-main" onClick={() => setOpen(t.id)}>
                  <strong>
                    <i className="admin-dot" style={{ background: t.color }} />
                    {t.title}
                  </strong>
                  <span className="muted">
                    {t.owner ? `@${t.owner.username} · ` : ''}
                    {fmtDate(t.created_at)} · {t.uses}명이 가져감
                  </span>
                </button>
                <span className="admin-badges">{!t.listed && <span className="badge">링크로만</span>}</span>
              </div>
              <div className="actions admin-row-actions">
                <button onClick={() => act(() => setListed(t.id, !t.listed))}>{t.listed ? '목록에서 내리기' : '목록에 공개'}</button>
                <button
                  className="danger"
                  onClick={() => confirm(`'${t.title}' 템플릿을 삭제할까요? 되돌릴 수 없어요.`) && act(() => deleteTemplate(t.id))}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <TemplateView id={open} onClose={() => setOpen(null)} onChanged={() => setTick((n) => n + 1)} />}
    </>
  )
}

// ---- 신고 ----

const STATUS_VIEWS: [ReportStatus, string][] = [
  ['open', '처리 전'],
  ['resolved', '처리함'],
  ['dismissed', '넘어감'],
]

function Reports() {
  const [status, setStatus] = useState<ReportStatus>('open')
  const [list, setList] = useState<Report[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setList(null)
    listReports(status)
      .then(setList)
      .catch((e) => setErr(errText(e)))
  }, [status, tick])

  const act = async (fn: () => Promise<void>) => {
    setErr(null)
    try {
      await fn()
      setTick((n) => n + 1)
    } catch (e) {
      setErr(errText(e))
    }
  }

  return (
    <>
      <div className="chips">
        {STATUS_VIEWS.map(([s, label]) => (
          <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
            {label}
          </button>
        ))}
      </div>
      {err && <p className="error">{err}</p>}
      {list === null ? (
        <p className="empty">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="empty">{status === 'open' ? '처리할 신고가 없어요.' : '없어요.'}</p>
      ) : (
        <ul className="admin-list">
          {list.map((r) => (
            <li key={r.id} className="admin-report">
              <div className="admin-report-head">
                <span className="badge">{r.target_type === 'template' ? '템플릿' : '사용자'}</span>
                <strong>{r.target ? r.target.title : '(삭제됨)'}</strong>
                {r.target?.sub && <span className="muted">{r.target.sub}</span>}
              </div>
              <p className="admin-report-reason">
                <b>{REPORT_REASONS[r.reason]}</b>
                {r.detail && ` · ${r.detail}`}
              </p>
              <p className="muted admin-report-meta">
                {r.reporter ? `@${r.reporter.username}` : '탈퇴한 사용자'}가 {fmtDateTime(r.created_at)}에 신고
                {r.handled_at && ` · ${fmtDateTime(r.handled_at)} 처리`}
              </p>
              <div className="actions admin-row-actions">
                {r.target && r.target_type === 'template' && <button onClick={() => setOpen(r.target_id)}>보기</button>}
                {r.target && r.target_type === 'template' && (
                  <button
                    onClick={() =>
                      act(async () => {
                        await setListed(r.target_id, false)
                        await setReportStatus(r.id, 'resolved')
                      })
                    }
                  >
                    목록에서 내리기
                  </button>
                )}
                {r.target && r.target_type === 'template' && (
                  <button
                    className="danger"
                    onClick={() =>
                      confirm(`'${r.target!.title}' 템플릿을 삭제할까요?`) &&
                      act(async () => {
                        await deleteTemplate(r.target_id)
                        await setReportStatus(r.id, 'resolved')
                      })
                    }
                  >
                    삭제
                  </button>
                )}
                {r.target && r.target_type === 'profile' && (
                  <BanButtons
                    who={r.target.title}
                    busy={false}
                    onBan={(days) =>
                      act(async () => {
                        await setBan(r.target_id, days)
                        await setReportStatus(r.id, 'resolved')
                      })
                    }
                  />
                )}
                {r.status === 'open' ? (
                  <>
                    <button onClick={() => act(() => setReportStatus(r.id, 'resolved'))}>처리함</button>
                    <button onClick={() => act(() => setReportStatus(r.id, 'dismissed'))}>넘어가기</button>
                  </>
                ) : (
                  <button onClick={() => act(() => setReportStatus(r.id, 'open'))}>처리 전으로</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <TemplateView id={open} onClose={() => setOpen(null)} />}
    </>
  )
}

// ---- 공지 ----

function Notices() {
  const [list, setList] = useState<Announcement[] | null>(null)
  const [edit, setEdit] = useState<Partial<Announcement> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    allAnnouncements()
      .then(setList)
      .catch((e) => setErr(errText(e)))
  }, [tick])

  const act = async (fn: () => Promise<void>) => {
    setErr(null)
    try {
      await fn()
      setTick((n) => n + 1)
    } catch (e) {
      setErr(errText(e))
    }
  }

  return (
    <>
      <p className="sheet-sub">켜 둔 공지는 할 일 화면 맨 위에 보여요. 사용자가 닫으면 그 기기에서는 다시 안 보여요.</p>
      {edit ? (
        <form
          className="login admin-notice-form"
          onSubmit={(e) => {
            e.preventDefault()
            act(async () => {
              await saveAnnouncement({ id: edit.id, title: (edit.title ?? '').trim(), body: (edit.body ?? '').trim(), active: edit.active ?? true })
              setEdit(null)
            })
          }}
        >
          <input required maxLength={60} placeholder="제목" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          <textarea maxLength={1000} rows={4} placeholder="내용 (선택)" value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          <label className="admin-check">
            <input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> 바로 보이기
          </label>
          <div className="actions">
            <button className="primary">{edit.id ? '저장' : '올리기'}</button>
            <button type="button" onClick={() => setEdit(null)}>
              취소
            </button>
          </div>
        </form>
      ) : (
        <button className="primary wide" onClick={() => setEdit({ active: true })}>
          새 공지 쓰기
        </button>
      )}
      {err && <p className="error">{err}</p>}
      {list === null ? (
        <p className="empty">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="empty">아직 올린 공지가 없어요.</p>
      ) : (
        <ul className="admin-list">
          {list.map((a) => (
            <li key={a.id}>
              <div className="admin-item">
                <span className="admin-item-main">
                  <strong>{a.title}</strong>
                  <span className="muted">{fmtDateTime(a.created_at)}</span>
                  {a.body && <span className="admin-notice-body">{a.body}</span>}
                </span>
                <button
                  className={`switch ${a.active ? 'on' : ''}`}
                  role="switch"
                  aria-checked={a.active}
                  aria-label="공지 보이기"
                  onClick={() => act(() => saveAnnouncement({ ...a, active: !a.active }))}
                />
              </div>
              <div className="actions admin-row-actions">
                <button onClick={() => setEdit(a)}>고치기</button>
                <button className="danger" onClick={() => confirm(`'${a.title}' 공지를 삭제할까요?`) && act(() => deleteAnnouncement(a.id))}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---- 사용자 쪽: 신고하기, 공지 띄우기 ----

/** A quiet "신고하기" link that opens a small form. */
export function ReportLink({ type, id }: { type: ReportTarget; id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <>
      <button className="link report-link" onClick={() => setOpen(true)}>
        신고하기
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} title={type === 'template' ? '템플릿 신고' : '사용자 신고'}>
          {done ? (
            <>
              <p className="sheet-sub">신고를 받았어요. 관리자가 확인한 뒤 조치할게요.</p>
              <button className="primary wide" onClick={() => setOpen(false)}>
                닫기
              </button>
            </>
          ) : (
            <form
              className="login"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!reason) return setErr('이유를 골라 주세요')
                setBusy(true)
                setErr(null)
                try {
                  await sendReport(type, id, reason, detail)
                  setDone(true)
                } catch (e) {
                  setErr(errText(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <p className="sheet-sub">어떤 문제가 있나요? 신고한 사람은 상대에게 알려지지 않아요.</p>
              <div className="chips report-reasons">
                {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                  <button type="button" key={r} className={reason === r ? 'on' : ''} onClick={() => setReason(r)}>
                    {REPORT_REASONS[r]}
                  </button>
                ))}
              </div>
              <textarea maxLength={500} rows={3} placeholder="자세한 내용 (선택)" value={detail} onChange={(e) => setDetail(e.target.value)} />
              <button className="primary" disabled={busy || !reason}>
                신고하기
              </button>
              {err && <p className="error">{err}</p>}
            </form>
          )}
        </Sheet>
      )}
    </>
  )
}

export function NoticeBanner({ notice, onClose }: { notice: Announcement; onClose: () => void }) {
  const [more, setMore] = useState(false)
  return (
    <div className="notice-banner" role="status">
      <button className="notice-text" onClick={() => setMore(!more)} aria-expanded={more}>
        <strong>{notice.title}</strong>
        {notice.body && <span className={more ? 'notice-body open' : 'notice-body'}>{notice.body}</span>}
      </button>
      <button className="icon-btn" onClick={onClose} aria-label="공지 닫기" title="닫기">
        <CloseIcon />
      </button>
    </div>
  )
}
