import { useEffect, useState, type ReactNode } from 'react'
import { listFollowers, type Profile } from '../social'
import { PALETTE, addCategory, deleteCategory, setVisibility, updateCategory } from '../store'
import { useSync } from '../sync'
import type { Category, Visibility } from '../types'
import { FriendsIcon, LockIcon, PersonIcon, PlusIcon, ShareIcon, TrashIcon } from './Icons'
import Sheet from './Sheet'
import { TemplateMaker } from './Templates'

export default function CategorySheet({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const [visFor, setVisFor] = useState<string | null>(null)
  const [sharing, setSharing] = useState<Category | null>(null)
  const add = () => {
    if (name.trim()) addCategory(name.trim())
    setName('')
  }

  // shown in place of this sheet; a sheet inside a sheet gets clipped
  if (sharing) return <TemplateMaker category={sharing} onClose={() => setSharing(null)} />

  return (
    <Sheet title="카테고리 관리" onClose={onClose}>
      <p className="sheet-sub">순서는 할 일 화면에서 카테고리 이름을 길게 눌러 끌면 바뀌어요.</p>
      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id}>
            <div className="cat-row">
              <button
                className="swatch"
                style={{ background: c.color }}
                onClick={() => setPicking(picking === c.id ? null : c.id)}
                aria-label="색 바꾸기"
              />
              <input
                defaultValue={c.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== c.name) updateCategory(c.id, { name: v })
                }}
              />
              <button className="icon-btn" onClick={() => setSharing(c)} aria-label="템플릿으로 공유" title="템플릿으로 공유">
                <ShareIcon />
              </button>
              <button
                className="icon-btn"
                onClick={() => confirm(`'${c.name}' 카테고리와 그 안의 할 일을 모두 삭제할까요?`) && deleteCategory(c.id)}
                aria-label="삭제"
                title="삭제"
              >
                <TrashIcon />
              </button>
            </div>
            <button className={`vis-chip ${visFor === c.id ? 'open' : ''}`} onClick={() => setVisFor(visFor === c.id ? null : c.id)} aria-expanded={visFor === c.id}>
              {VIS[c.visibility].icon}
              {VIS[c.visibility].label}
              {c.visibility === 'selected' && ` · ${c.allowed_ids.length}명`}
              <svg className="chev" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {visFor === c.id && <VisibilityPanel category={c} />}
            {picking === c.id && (
              <div className="palette">
                {PALETTE.map((p) => (
                  <button
                    key={p}
                    className={`swatch ${p === c.color ? 'on' : ''}`}
                    style={{ background: p }}
                    onClick={() => {
                      updateCategory(c.id, { color: p })
                      setPicking(null)
                    }}
                    aria-label={p}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="cat-add">
        <input
          autoFocus
          placeholder="새 카테고리 이름 (예: 운동, 공부)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()}
        />
        <button className="primary icon-add" onClick={add} aria-label="카테고리 추가" title="카테고리 추가" disabled={!name.trim()}>
          <PlusIcon />
        </button>
      </div>
    </Sheet>
  )
}

const VIS: Record<Visibility, { icon: ReactNode; label: string }> = {
  followers: { icon: <FriendsIcon />, label: '팔로워 공개' },
  selected: { icon: <PersonIcon />, label: '일부 공개' },
  private: { icon: <LockIcon />, label: '나만 보기' },
}

function VisibilityPanel({ category }: { category: Category }) {
  const { session } = useSync()
  const [followers, setFollowers] = useState<Profile[] | null>(null)
  const selected = category.visibility === 'selected'

  useEffect(() => {
    if (!selected || !session) return
    listFollowers().then(setFollowers).catch(() => setFollowers([]))
  }, [selected, session])

  const toggle = (id: string) => {
    const ids = category.allowed_ids.includes(id) ? category.allowed_ids.filter((x) => x !== id) : [...category.allowed_ids, id]
    setVisibility(category.id, 'selected', ids)
  }

  return (
    <div className="vis-panel">
      <div className="vis-options">
        {(Object.keys(VIS) as Visibility[]).map((v) => (
          <button key={v} className={category.visibility === v ? 'on' : ''} onClick={() => setVisibility(category.id, v)}>
            {VIS[v].icon} {VIS[v].label}
          </button>
        ))}
      </div>
      {selected &&
        (!session ? (
          <p className="sheet-sub">로그인하면 볼 수 있는 팔로워를 고를 수 있어요.</p>
        ) : followers === null ? (
          <p className="sheet-sub">팔로워 불러오는 중…</p>
        ) : followers.length === 0 ? (
          <p className="sheet-sub">아직 팔로워가 없어요. 팔로워가 생기면 여기서 고를 수 있어요.</p>
        ) : (
          <>
            <p className="sheet-sub">체크한 팔로워만 이 카테고리를 볼 수 있어요.</p>
            <ul className="pick-list">
              {followers.map((f) => (
                <li key={f.id}>
                  <label>
                    <input type="checkbox" checked={category.allowed_ids.includes(f.id)} onChange={() => toggle(f.id)} />
                    {f.name || f.username} <span className="handle">@{f.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ))}
    </div>
  )
}
