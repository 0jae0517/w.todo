import { useState } from 'react'
import { EMOJIS, type Reaction } from '../social'
import { CloseIcon, SmilePlusIcon } from './Icons'

interface Props {
  list: Reaction[]
  myId?: string | null
  /** shown only when reacting is allowed */
  onPick?: (emoji: string | null) => void
}

export default function ReactionBar({ list, myId, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const groups = new Map<string, Reaction[]>()
  for (const r of list) groups.set(r.emoji, [...(groups.get(r.emoji) ?? []), r])
  const mine = list.find((r) => r.user_id === myId)?.emoji ?? null
  if (!groups.size && !onPick) return null

  return (
    <div className="reactions">
      {[...groups].map(([emoji, rs]) => (
        <button
          key={emoji}
          className={`chip ${emoji === mine ? 'mine' : ''}`}
          title={rs.map((r) => r.profile?.name || r.profile?.username || '').join(', ')}
          onClick={() => onPick?.(emoji === mine ? null : emoji)}
          disabled={!onPick}
        >
          {emoji} {rs.length}
        </button>
      ))}
      {onPick && (
        <button className="chip add" onClick={() => setOpen(!open)} aria-label="감정표현">
          {open ? <CloseIcon /> : <SmilePlusIcon />}
        </button>
      )}
      {open && onPick && (
        <div className="picker">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className={e === mine ? 'mine' : ''}
              onClick={() => {
                onPick(e === mine ? null : e)
                setOpen(false)
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
