import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import {
  acceptRequest,
  follow,
  followingIds,
  listFollowers,
  listFollowing,
  listRequests,
  removeFollower,
  saveProfile,
  searchProfiles,
  unfollow,
  useMyProfile,
  type FollowState,
  type Profile,
} from '../social'
import { useSync } from '../sync'
import { UnfollowConfirm } from './ConfirmDialog'
import FriendView, { FOLLOW_LABEL } from './FriendView'
import Office from './Office'
import Sheet from './Sheet'
import { TemplateGallery } from './Templates'

/** The 오피스 tab: needs a login and a profile, like everything with friends. */
export function OfficeTab({ onLogin, onOpenFriend }: { onLogin: () => void; onOpenFriend: (p: Profile) => void }) {
  return (
    <SignedIn onLogin={onLogin}>
      {() => <Office onOpenFriend={onOpenFriend} />}
    </SignedIn>
  )
}

/** The 템플릿 tab. */
export function TemplatesTab() {
  return supabase ? <TemplateGallery /> : <p className="empty">동기화 서버가 아직 연결되지 않았어요.</p>
}

export type FollowTab = 'following' | 'followers'

/** Friends as a popup: following/followers, requests and search, or one friend's todos. */
export function FriendsSheet({ tab, friend, onClose, onLogin }: { tab?: FollowTab; friend?: Profile; onClose: () => void; onLogin: () => void }) {
  const [viewing, setViewing] = useState<Profile | null>(friend ?? null)
  return (
    <Sheet onClose={onClose}>
      <div className="friends-sheet">
        <SignedIn
          onLogin={() => {
            onClose()
            onLogin()
          }}
        >
          {(profile, reload) =>
            viewing ? (
              <FriendView friend={viewing} onBack={() => setViewing(null)} />
            ) : (
              <FriendHome me={profile} initialTab={tab} onOpen={setViewing} onEditProfile={reload} />
            )
          }
        </SignedIn>
      </div>
    </Sheet>
  )
}

/** Renders `children` once signed in with a profile; otherwise a way to get there. */
function SignedIn({ onLogin, children }: { onLogin: () => void; children: (profile: Profile, reload: () => void) => ReactNode }) {
  const { session } = useSync()
  const { profile, reload } = useMyProfile()

  if (!supabase || !session) {
    return (
      <div className="friends-empty">
        <p>친구 기능은 로그인하면 쓸 수 있어요.</p>
        {supabase ? (
          <button className="primary" onClick={onLogin}>로그인</button>
        ) : (
          <p className="sheet-sub">동기화 서버가 아직 연결되지 않았어요.</p>
        )}
      </div>
    )
  }
  if (profile === undefined) return <p className="empty">불러오는 중…</p>
  if (profile === null) return <ProfileForm onSaved={reload} />
  return children(profile, reload)
}

export function ProfileForm({ onSaved, initial }: { onSaved: () => void; initial?: Profile }) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="login"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setErr(null)
        try {
          await saveProfile(username.trim().toLowerCase(), name.trim())
          onSaved()
        } catch (e) {
          setErr(e instanceof Error ? e.message : String(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 className="sheet-title">{initial ? '프로필 수정' : '프로필 만들기'}</h2>
      <p className="sheet-sub">친구가 아이디로 나를 찾아 팔로우할 수 있어요.</p>
      <input required placeholder="아이디 (영문 소문자, 숫자, _ .)" value={username} pattern="[a-zA-Z0-9_.]{3,20}" onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="이름 (선택)" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="primary" disabled={busy}>저장</button>
      {err && <p className="error">{err}</p>}
    </form>
  )
}

function FriendHome({ me, initialTab = 'following', onOpen, onEditProfile }: { me: Profile; initialTab?: FollowTab; onOpen: (p: Profile) => void; onEditProfile: () => void }) {
  const [tab, setTab] = useState<FollowTab>(initialTab)
  const [following, setFollowing] = useState<Profile[]>([])
  const [followers, setFollowers] = useState<Profile[]>([])
  const [requests, setRequests] = useState<Profile[]>([])
  const [ids, setIds] = useState<Map<string, FollowState>>(new Map())
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Profile[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [unfollowing, setUnfollowing] = useState<Profile | null>(null)

  const refresh = () =>
    Promise.all([listFollowing(), listFollowers(), followingIds(), listRequests()])
      .then(([a, b, c, d]) => {
        setFollowing(a)
        setFollowers(b)
        setIds(c)
        setRequests(d)
      })
      .catch((e) => setErr(e.message))

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!q.trim()) return setResults(null)
    const t = setTimeout(() => searchProfiles(q).then(setResults).catch((e) => setErr(e.message)), 300)
    return () => clearTimeout(t)
  }, [q])

  const run = async (action: Promise<void>) => {
    setErr(null)
    try {
      await action
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (editing) return <ProfileForm initial={me} onSaved={() => { setEditing(false); onEditProfile() }} />

  const list = results ?? (tab === 'following' ? following : followers)

  return (
    <div className="friends">
      <div className="me-card">
        <div>
          <strong>{me.name || me.username}</strong>
          <span className="handle">@{me.username}</span>
        </div>
        <button className="link" onClick={() => setEditing(true)}>수정</button>
      </div>
      <div className="counts">
        <button className={tab === 'followers' && !results ? 'on' : ''} onClick={() => { setQ(''); setTab('followers') }}>
          <strong>{followers.length}</strong> 팔로워
        </button>
        <button className={tab === 'following' && !results ? 'on' : ''} onClick={() => { setQ(''); setTab('following') }}>
          <strong>{following.length}</strong> 팔로잉
        </button>
      </div>
      <input className="search" placeholder="아이디나 이름으로 친구 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      {requests.length > 0 && !results && (
        <>
          <h3 className="sub-title">팔로우 요청 {requests.length}</h3>
          <ul className="people requests">
            {requests.map((p) => (
              <li key={p.id}>
                <button className="person" onClick={() => onOpen(p)}>
                  <span className="avatar">{(p.name || p.username).slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{p.name || p.username}</strong>
                    <span className="handle">@{p.username}</span>
                  </span>
                </button>
                <button className="link" onClick={() => run(removeFollower(p.id))}>거절</button>
                <button className="follow" onClick={() => run(acceptRequest(p.id))}>수락</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <ul className="people">
        {list.map((p) => (
          <li key={p.id}>
            <button className="person" onClick={() => onOpen(p)}>
              <span className="avatar">{(p.name || p.username).slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{p.name || p.username}</strong>
                <span className="handle">@{p.username}</span>
              </span>
            </button>
            {tab === 'followers' && !results && (
              <button className="link danger" onClick={() => confirm(`${p.name || p.username}님을 팔로워에서 삭제할까요?`) && run(removeFollower(p.id))}>
                삭제
              </button>
            )}
            <button className={ids.has(p.id) ? 'follow on' : 'follow'} onClick={() => (ids.has(p.id) ? setUnfollowing(p) : run(follow(p.id)))}>
              {ids.has(p.id) ? FOLLOW_LABEL[ids.get(p.id)!] : tab === 'followers' && !results ? '맞팔로우' : '팔로우'}
            </button>
          </li>
        ))}
        {!list.length && (
          <li className="empty">
            {results ? '찾는 사람이 없어요.' : tab === 'following' ? '위에서 친구를 찾아 팔로우해 보세요.' : '아직 팔로워가 없어요.'}
          </li>
        )}
      </ul>
      {unfollowing && ids.has(unfollowing.id) && (
        <UnfollowConfirm
          name={unfollowing.name || unfollowing.username}
          state={ids.get(unfollowing.id)!}
          onCancel={() => setUnfollowing(null)}
          onConfirm={() => {
            const id = unfollowing.id
            setUnfollowing(null)
            run(unfollow(id))
          }}
        />
      )}
    </div>
  )
}
