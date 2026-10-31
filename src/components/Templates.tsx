import { useEffect, useMemo, useState } from 'react'
import { dayLabel, timeLabel, todayKey } from '../date'
import { useMyProfile } from '../social'
import { applyTemplate, addCategory, useStore } from '../store'
import { useSync } from '../sync'
import {
  countUse,
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  myTemplates,
  setListed,
  shareLink,
  type Template,
  type TemplateItem,
} from '../templates'
import type { Category } from '../types'
import { CheckMarkIcon, GlobeIcon, LinkIcon, PlusIcon, RepeatIcon } from './Icons'
import { ReportLink } from './Admin'
import Sheet from './Sheet'
import { repeatLabel } from './TodoSheet'

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const itemKey = (it: TemplateItem) => `${it.title}|${it.time}|${it.days.join()}`

function ItemList({ items }: { items: TemplateItem[] }) {
  return (
    <ul className="tpl-items">
      {items.map((it, i) => (
        <li key={i}>
          <span className="tpl-item-title">{it.title}</span>
          <span className="muted">
            {it.time && `${timeLabel(it.time)} · `}
            {it.days.length ? (
              <>
                <RepeatIcon /> {repeatLabel(it.days)}
              </>
            ) : (
              '한 번'
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ---- making a template from a category ----

/** Shares a category's repeating todos (and today's one-off todos) as a template. */
export function TemplateMaker({ category, onClose }: { category: Category; onClose: () => void }) {
  const { session } = useSync()
  const { profile } = useMyProfile()
  const { routines, todos } = useStore()
  const today = todayKey()

  const candidates = useMemo(() => {
    const list: TemplateItem[] = [
      ...routines.filter((r) => r.category_id === category.id).map((r) => ({ title: r.title, time: r.time, days: [...r.days].sort() })),
      ...todos.filter((t) => t.category_id === category.id && t.date === today && !t.routine_id).map((t) => ({ title: t.title, time: t.time, days: [] })),
    ]
    // the same line twice is noise
    return list.filter((it, i) => list.findIndex((x) => itemKey(x) === itemKey(it)) === i)
  }, [routines, todos, category.id, today])

  const [title, setTitle] = useState(category.name)
  const [description, setDescription] = useState('')
  const [picked, setPicked] = useState(() => new Set(candidates.map(itemKey)))
  const [extra, setExtra] = useState<TemplateItem[]>([])
  const [draft, setDraft] = useState('')
  const [listed, setListedState] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [made, setMade] = useState<{ id: string; title: string } | null>(null)
  const [shared, setShared] = useState<string | null>(null)

  const items = [...candidates.filter((it) => picked.has(itemKey(it))), ...extra]

  if (!session || !profile)
    return (
      <Sheet title="템플릿으로 공유" onClose={onClose}>
        <p className="sheet-sub">{session ? '친구 탭에서 프로필을 먼저 만들어 주세요.' : '로그인하면 템플릿을 공유할 수 있어요.'}</p>
      </Sheet>
    )

  if (made)
    return (
      <Sheet title="템플릿을 만들었어요" onClose={onClose}>
        <p className="sheet-sub">
          {listed ? '친구 탭의 템플릿 목록에 올라갔어요. 링크로도 보낼 수 있어요.' : '링크를 받은 사람만 볼 수 있어요.'}
        </p>
        <button className="primary wide" onClick={async () => setShared(await shareLink(made))}>
          링크 공유하기
        </button>
        {shared === 'copied' && <p className="sheet-sub">링크를 복사했어요.</p>}
      </Sheet>
    )

  const submit = async () => {
    setBusy(true)
    setErr(null)
    try {
      const id = await createTemplate({ title: title.trim(), description: description.trim(), color: category.color, items, listed })
      setMade({ id, title: title.trim() })
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const addExtra = () => {
    const t = draft.trim()
    if (t) setExtra([...extra, { title: t, time: null, days: [] }])
    setDraft('')
  }

  return (
    <Sheet title="템플릿으로 공유" onClose={onClose}>
      <p className="sheet-sub">고른 할 일만 제목·시간·반복 요일로 공유돼요. 완료 기록이나 집중 시간은 공유되지 않아요.</p>
      <input className="sheet-input" placeholder="템플릿 이름" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="tpl-desc" placeholder="설명 (선택)" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />

      <h3 className="sub-title">담을 할 일</h3>
      {candidates.length === 0 && extra.length === 0 && <p className="sheet-sub">이 카테고리에 반복 할 일이나 오늘 할 일이 없어요. 아래에서 직접 추가해 주세요.</p>}
      <ul className="pick-list">
        {candidates.map((it) => {
          const k = itemKey(it)
          return (
            <li key={k}>
              <label>
                <input
                  type="checkbox"
                  checked={picked.has(k)}
                  onChange={() => {
                    const next = new Set(picked)
                    if (next.has(k)) next.delete(k)
                    else next.add(k)
                    setPicked(next)
                  }}
                />
                {it.title}
                <span className="muted">
                  {' '}
                  {it.time && timeLabel(it.time)}
                  {it.time && it.days.length > 0 && ' · '}
                  {it.days.length > 0 && (
                    <>
                      <RepeatIcon /> {repeatLabel(it.days)}
                    </>
                  )}
                </span>
              </label>
            </li>
          )
        })}
        {extra.map((it, i) => (
          <li key={`x${i}`}>
            <label>
              <input type="checkbox" checked onChange={() => setExtra(extra.filter((_, j) => j !== i))} />
              {it.title}
            </label>
          </li>
        ))}
      </ul>
      <div className="cat-add">
        <input placeholder="항목 직접 추가" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addExtra()} />
        <button className="icon-add" onClick={addExtra} aria-label="항목 추가" title="항목 추가">
          <PlusIcon />
        </button>
      </div>

      <div className="vis-options">
        <button className={listed ? 'on' : ''} onClick={() => setListedState(true)}>
          <GlobeIcon /> 목록에 공개
        </button>
        <button className={!listed ? 'on' : ''} onClick={() => setListedState(false)}>
          <LinkIcon /> 링크로만
        </button>
      </div>
      {err && <p className="error">{err}</p>}
      <button className="primary wide" disabled={busy || !title.trim() || !items.length} onClick={submit}>
        {items.length}개 항목으로 템플릿 만들기
      </button>
    </Sheet>
  )
}

// ---- viewing / using a template ----

const NEW = '__new'

export function TemplateView({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const { categories } = useStore()
  const { session } = useSync()
  const [t, setT] = useState<Template | null | undefined>(undefined)
  const [target, setTarget] = useState(NEW)
  const [date, setDate] = useState(todayKey)
  const [done, setDone] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const mine = !!t && t.owner_id === session?.user.id

  useEffect(() => {
    getTemplate(id)
      .then(setT)
      .catch((e) => {
        setErr(errText(e))
        setT(null)
      })
  }, [id])

  if (t === undefined) return <Sheet onClose={onClose}><p className="empty">불러오는 중…</p></Sheet>
  if (t === null)
    return (
      <Sheet onClose={onClose}>
        <p className="empty">{err ?? '템플릿을 찾을 수 없어요. 삭제되었을 수 있어요.'}</p>
      </Sheet>
    )

  const use = () => {
    const categoryId = target === NEW ? addCategory(t.title, t.color) : target
    applyTemplate(t.items, categoryId, date)
    countUse(t.id).catch(() => {})
    setDone(true)
  }

  const repeating = t.items.some((it) => it.days.length)

  return (
    <Sheet onClose={onClose}>
      <div className="tpl-head" style={{ '--c': t.color } as React.CSSProperties}>
        <h2 className="sheet-title">{t.title}</h2>
        <p className="sheet-sub">
          {t.owner && `@${t.owner.username} · `}
          {t.items.length}개 항목 · {t.uses}명이 가져감
        </p>
      </div>
      {t.description && <p className="tpl-description">{t.description}</p>}
      <ItemList items={t.items} />

      {done ? (
        <p className="tpl-done">
          <CheckMarkIcon /> {target === NEW ? `'${t.title}' 카테고리에` : '고른 카테고리에'} 추가했어요.
          {repeating && ` 반복 할 일은 ${dayLabel(date)}부터 시작돼요.`}
        </p>
      ) : (
        <>
          <h3 className="sub-title">내 할 일에 추가</h3>
          <label className="field">
            <span>카테고리</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value={NEW}>새 카테고리 '{t.title}'</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{repeating ? '시작 날짜' : '날짜'}</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <button className="primary wide" onClick={use}>내 할 일에 추가</button>
        </>
      )}

      <div className="actions">
        <button onClick={async () => setNote((await shareLink(t)) === 'copied' ? '링크를 복사했어요.' : null)}>링크 공유</button>
        {mine && (
          <>
            <button
              onClick={async () => {
                await setListed(t.id, !t.listed)
                setT({ ...t, listed: !t.listed })
                onChanged?.()
              }}
            >
              {t.listed ? '목록에서 내리기' : '목록에 공개'}
            </button>
            <button
              onClick={async () => {
                if (!confirm(`'${t.title}' 템플릿을 삭제할까요? 이미 가져간 사람의 할 일은 그대로 남아요.`)) return
                await deleteTemplate(t.id)
                onChanged?.()
                onClose()
              }}
            >
              삭제
            </button>
          </>
        )}
      </div>
      {note && <p className="sheet-sub">{note}</p>}
      {session && !mine && <ReportLink type="template" id={t.id} />}
    </Sheet>
  )
}

// ---- browsing ----

export function TemplateGallery() {
  const { session } = useSync()
  const [q, setQ] = useState('')
  const [list, setList] = useState<Template[] | null>(null)
  const [mine, setMine] = useState<Template[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const h = setTimeout(
      () =>
        listTemplates(q)
          .then(setList)
          .catch((e) => setErr(errText(e))),
      q ? 300 : 0,
    )
    return () => clearTimeout(h)
  }, [q, tick])

  useEffect(() => {
    if (!session) return setMine([])
    myTemplates().then(setMine).catch(() => {})
  }, [session, tick])

  const card = (t: Template) => (
    <li key={t.id}>
      <button className="tpl-card" style={{ '--c': t.color } as React.CSSProperties} onClick={() => setOpen(t.id)}>
        <strong>{t.title}</strong>
        <span className="muted">
          {t.owner ? `@${t.owner.username} · ` : ''}
          {t.items.length}개 · {t.uses}명이 가져감{!t.listed && ' · 링크로만'}
        </span>
        {t.description && <span className="tpl-card-desc">{t.description}</span>}
      </button>
    </li>
  )

  return (
    <div className="templates">
      <p className="sheet-sub">다른 사람의 루틴을 가져오거나, 카테고리 관리(오른쪽 위 +)에서 공유 버튼을 눌러 내 루틴을 공유할 수 있어요.</p>
      <input className="search" placeholder="템플릿 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      {mine.length > 0 && !q && (
        <>
          <h3 className="sub-title">내 템플릿</h3>
          <ul className="tpl-list">{mine.map(card)}</ul>
        </>
      )}
      <h3 className="sub-title">{q ? '검색 결과' : '인기 템플릿'}</h3>
      {list === null ? (
        <p className="empty">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="empty">{q ? '찾는 템플릿이 없어요.' : '아직 공개된 템플릿이 없어요. 첫 템플릿을 올려 보세요!'}</p>
      ) : (
        <ul className="tpl-list">{list.map(card)}</ul>
      )}
      {open && <TemplateView id={open} onClose={() => setOpen(null)} onChanged={() => setTick(tick + 1)} />}
    </div>
  )
}
