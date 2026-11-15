import { useMemo, useState } from 'react'
import { dayLabel } from '../date'
import { useStore } from '../store'
import type { Todo } from '../types'
import { CheckMarkIcon, ListCheckIcon, NoteIcon } from './Icons'
import Sheet from './Sheet'

const MAX = 60

/** Finds past and upcoming todos by title, memo or checklist item. */
export default function SearchSheet({ onPick, onClose }: { onPick: (t: Todo) => void; onClose: () => void }) {
  const { todos, categories, notes } = useStore()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!term) return []
    const hit = (s: string) => s.toLowerCase().includes(term)
    return todos
      .map((t) => {
        const n = notes[t.id]
        const where = hit(t.title) ? 'title' : n && hit(n.memo) ? 'memo' : n?.items.some((it) => hit(it.title)) ? 'item' : null
        return where && { todo: t, where }
      })
      .filter((x): x is { todo: Todo; where: 'title' | 'memo' | 'item' } => !!x)
      .sort((a, b) => b.todo.date.localeCompare(a.todo.date))
      .slice(0, MAX)
  }, [term, todos, notes])

  const colorOf = new Map(categories.map((c) => [c.id, c.color]))

  return (
    <Sheet onClose={onClose} title="할 일 검색">
      <input className="search" autoFocus placeholder="제목, 메모, 체크리스트로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
      {term && !results.length && <p className="empty search-empty">찾는 할 일이 없어요</p>}
      <ul className="search-results">
        {results.map(({ todo: t, where }) => (
          <li key={t.id}>
            <button onClick={() => onPick(t)}>
              <span className="cat-dot" style={{ background: colorOf.get(t.category_id) ?? 'var(--surface)' }} />
              <span className="search-main">
                <span className={`search-title ${t.done ? 'done' : ''}`}>{t.title}</span>
                <span className="search-date">
                  {dayLabel(t.date)}
                  {where === 'memo' && (
                    <>
                      {' · '}
                      <NoteIcon /> 메모에서 찾음
                    </>
                  )}
                  {where === 'item' && (
                    <>
                      {' · '}
                      <ListCheckIcon /> 체크리스트에서 찾음
                    </>
                  )}
                </span>
              </span>
              {t.done && (
                <span className="search-done" aria-label="완료">
                  <CheckMarkIcon />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {results.length === MAX && <p className="sheet-sub">최근 {MAX}개까지 보여요. 더 자세히 적어 보세요.</p>}
    </Sheet>
  )
}
