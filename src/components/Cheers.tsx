import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CHEER_MAX, markCheersRead, sendCheer, unreadCheers, type Cheer, type Profile } from '../social'
import { useSync } from '../sync'
import { toast } from '../dialogs'
import { ChatIcon, CloseIcon, PokeIcon } from './Icons'
import Sheet from './Sheet'

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (min < 60 * 24) return `${Math.round(min / 60)}시간 전`
  return `${Math.round(min / 60 / 24)}일 전`
}

/** Pokes and messages friends sent me, above the todo list until I close them. */
export default function CheerInbox({ onOpenFriend }: { onOpenFriend: (p: Profile) => void }) {
  const { session } = useSync()
  const uid = session?.user.id
  const [list, setList] = useState<Cheer[]>([])

  useEffect(() => {
    if (!supabase || !uid) return setList([])
    let alive = true
    const load = () => unreadCheers().then((l) => alive && setList(l)).catch(() => {})
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    const channel = supabase
      .channel(`cheers:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cheers', filter: `to_id=eq.${uid}` }, load)
      .subscribe()
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      supabase?.removeChannel(channel)
    }
  }, [uid])

  if (!list.length) return null
  const close = (ids: string[]) => {
    setList(list.filter((c) => !ids.includes(c.id)))
    markCheersRead(ids).catch(() => {})
  }
  const shown = list.slice(0, 3)

  return (
    <section className="cheers" aria-label="친구가 보낸 응원">
      {shown.map((c) => {
        const name = c.from?.name || c.from?.username || '친구'
        return (
          <div key={c.id} className="cheer-card">
            <span className="cheer-icon">{c.kind === 'poke' ? <PokeIcon /> : <ChatIcon />}</span>
            <button className="cheer-text" onClick={() => c.from && (close([c.id]), onOpenFriend(c.from))}>
              {c.kind === 'poke' ? (
                <span>
                  <b>{name}</b>님이 콕 찔렀어요
                </span>
              ) : (
                <span>
                  <b>{name}</b> {c.body}
                </span>
              )}
              <small>{ago(c.created_at)}</small>
            </button>
            <button className="cheer-close" aria-label="닫기" onClick={() => close([c.id])}>
              <CloseIcon />
            </button>
          </div>
        )
      })}
      {list.length > 1 && (
        <button className="cheer-all link" onClick={() => close(list.map((c) => c.id))}>
          {list.length > shown.length ? `외 ${list.length - shown.length}개 · ` : ''}모두 읽음
        </button>
      )}
    </section>
  )
}

/** 콕 찌르기 and 응원 보내기, on a friend I follow. */
export function CheerButtons({ friend }: { friend: Profile }) {
  const [writing, setWriting] = useState(false)
  const name = friend.name || friend.username
  const poke = async () => {
    try {
      await sendCheer(friend.id, 'poke')
      toast(`${name}님을 콕 찔렀어요`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <>
      <div className="cheer-buttons">
        <button onClick={poke}>
          <PokeIcon /> 콕 찌르기
        </button>
        <button onClick={() => setWriting(true)}>
          <ChatIcon /> 응원 보내기
        </button>
      </div>
      {writing && <CheerSheet friend={friend} onClose={() => setWriting(false)} />}
    </>
  )
}

const QUICK = ['화이팅!', '오늘도 수고했어', '같이 집중하자', '거의 다 왔어!', '대단해']

function CheerSheet({ friend, onClose }: { friend: Profile; onClose: () => void }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const name = friend.name || friend.username
  const send = async (text: string) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendCheer(friend.id, 'message', text)
      toast(`${name}님에게 응원을 보냈어요`)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setSending(false)
    }
  }
  return (
    <Sheet onClose={onClose} title={`${name}님에게 응원 보내기`}>
      <div className="pick-chips cheer-quick">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={sending}>
            {q}
          </button>
        ))}
      </div>
      <input
        className="sheet-input"
        maxLength={CHEER_MAX}
        placeholder="직접 쓰기"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send(body)}
      />
      <p className="sheet-sub cheer-count">
        {body.length}/{CHEER_MAX}
      </p>
      {err && <p className="error">{err}</p>}
      <div className="actions">
        <button onClick={onClose}>취소</button>
        <button className="primary" disabled={!body.trim() || sending} onClick={() => send(body)}>
          보내기
        </button>
      </div>
    </Sheet>
  )
}
