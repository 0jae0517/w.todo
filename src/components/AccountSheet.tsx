import { useState } from 'react'
import { supabase } from '../supabase'
import { sendLoginLink, signOut, syncNow, useSync, type SyncStatus } from '../sync'
import Sheet from './Sheet'

export const STATUS_LABEL: Record<SyncStatus, string> = {
  off: '이 기기에만 저장 중',
  'signed-out': '로그인하면 동기화돼요',
  syncing: '동기화 중…',
  synced: '동기화됨',
  offline: '오프라인 (연결되면 자동 동기화)',
  error: '동기화 오류',
}

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const { status, session, error } = useSync()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!supabase) {
    return (
      <Sheet title="동기화" onClose={onClose}>
        <p className="sheet-sub">
          아직 동기화 서버가 연결되지 않아 이 기기에만 저장하고 있어요. 서버를 연결하면 지금까지 쓴 할 일도 그대로 올라가요.
        </p>
      </Sheet>
    )
  }

  if (!session) {
    return (
      <Sheet title="로그인" onClose={onClose}>
        {sent ? (
          <p className="sheet-sub">{email} 으로 로그인 링크를 보냈어요. 메일의 링크를 이 브라우저에서 열어 주세요.</p>
        ) : (
          <form
            className="login"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setMsg(null)
              try {
                await sendLoginLink(email.trim())
                setSent(true)
              } catch (err) {
                setMsg(err instanceof Error ? err.message : String(err))
              } finally {
                setBusy(false)
              }
            }}
          >
            <p className="sheet-sub">이메일로 받은 링크를 누르면 로그인돼요. 비밀번호는 필요 없어요.</p>
            <input type="email" required placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="primary" disabled={busy}>로그인 링크 받기</button>
            {msg && <p className="error">{msg}</p>}
          </form>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet title="동기화" onClose={onClose}>
      <p className="sheet-sub">{session.user.email}</p>
      <p className={`status-line s-${status}`}>{STATUS_LABEL[status]}</p>
      {error && status === 'error' && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => syncNow()}>지금 동기화</button>
        <button onClick={() => signOut()}>로그아웃</button>
      </div>
    </Sheet>
  )
}
