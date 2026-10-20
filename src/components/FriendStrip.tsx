import { useEffect, useState } from 'react'
import { listFollowing, useMyProfile, type Profile } from '../social'
import { useSync } from '../sync'

const initial = (p: Profile) => (p.name || p.username).slice(0, 1).toUpperCase()

/** Row of avatars above the calendar: me, then everyone I follow (like Todomate). */
export default function FriendStrip({ selected, onSelect, onFind }: { selected: Profile | null; onSelect: (p: Profile | null) => void; onFind: () => void }) {
  const { session } = useSync()
  const { profile } = useMyProfile()
  const [following, setFollowing] = useState<Profile[]>([])

  useEffect(() => {
    if (!session) return setFollowing([])
    listFollowing().then(setFollowing).catch(() => {})
  }, [session])

  if (!session || !profile) return null
  return (
    <div className="friend-strip">
      <button className={`strip-item ${selected ? '' : 'on'}`} onClick={() => onSelect(null)}>
        <span className="avatar">{initial(profile)}</span>
        <span className="strip-name">나</span>
      </button>
      {following.map((p) => (
        <button key={p.id} className={`strip-item ${selected?.id === p.id ? 'on' : ''}`} onClick={() => onSelect(p)}>
          <span className="avatar">{initial(p)}</span>
          <span className="strip-name">{p.name || p.username}</span>
        </button>
      ))}
      <button className="strip-item" onClick={onFind} aria-label="친구 찾기">
        <span className="avatar add">+</span>
        <span className="strip-name">친구 찾기</span>
      </button>
    </div>
  )
}
