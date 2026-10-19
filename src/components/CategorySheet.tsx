import { useState } from 'react'
import { PALETTE, addCategory, deleteCategory, moveCategory, updateCategory } from '../store'
import type { Category } from '../types'
import Sheet from './Sheet'

export default function CategorySheet({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const add = () => {
    if (name.trim()) addCategory(name.trim())
    setName('')
  }

  return (
    <Sheet title="카테고리 관리" onClose={onClose}>
      <p className="sheet-sub">👥 팔로워에게 공개 · 🔒 나만 보기</p>
      <ul className="cat-list">
        {categories.map((c, i) => (
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
              <button
                className={`icon-btn vis ${c.private ? 'on' : ''}`}
                onClick={() => updateCategory(c.id, { private: !c.private })}
                aria-label={c.private ? '나만 보기' : '팔로워 공개'}
                title={c.private ? '나만 보기 (팔로워에게 안 보여요)' : '팔로워에게 공개'}
              >
                {c.private ? '🔒' : '👥'}
              </button>
              <button className="icon-btn" disabled={i === 0} onClick={() => moveCategory(c.id, -1)} aria-label="위로">↑</button>
              <button className="icon-btn" disabled={i === categories.length - 1} onClick={() => moveCategory(c.id, 1)} aria-label="아래로">↓</button>
              <button
                className="icon-btn"
                onClick={() => confirm(`'${c.name}' 카테고리와 그 안의 할 일을 모두 삭제할까요?`) && deleteCategory(c.id)}
                aria-label="삭제"
              >
                🗑
              </button>
            </div>
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
        <button className="primary" onClick={add}>추가</button>
      </div>
    </Sheet>
  )
}
