import { useState } from 'react'
import { supabase } from '../supabase'
import { sendLoginLink, setPassword, signInWithPassword, signOut, signUp, syncNow, useSync, type SyncStatus } from '../sync'
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

  if (!supabase) {
    return (
      <Sheet title="동기화" onClose={onClose}>
        <p className="sheet-sub">
          아직 동기화 서버가 연결되지 않아 이 기기에만 저장하고 있어요. 서버를 연결하면 지금까지 쓴 할 일도 그대로 올라가요.
        </p>
      </Sheet>
    )
  }

  if (!session) return <LoginForm onClose={onClose} />

  return (
    <Sheet title="동기화" onClose={onClose}>
      <p className="sheet-sub">{session.user.email}</p>
      <p className={`status-line s-${status}`}>{STATUS_LABEL[status]}</p>
      {error && status === 'error' && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => syncNow()}>지금 동기화</button>
        <button onClick={() => signOut()}>로그아웃</button>
      </div>
      <PasswordForm />
    </Sheet>
  )
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

function LoginForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      setMsg(await fn())
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="로그인" onClose={onClose}>
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            await signInWithPassword(email.trim(), password)
            return null
          })
        }}
      >
        <p className="sheet-sub">같은 이메일과 비밀번호로 로그인하면 휴대폰과 컴퓨터의 할 일이 같이 보여요.</p>
        <input type="email" required autoComplete="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={6} autoComplete="current-password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPw(e.target.value)} />
        <button className="primary" disabled={busy}>로그인</button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (!email.trim() || password.length < 6) throw new Error('이메일과 6자 이상 비밀번호를 입력해 주세요')
              const needsConfirm = await signUp(email.trim(), password)
              return needsConfirm ? `${email} 으로 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 여기서 로그인해 주세요.` : null
            })
          }
        >
          처음이에요 (가입하기)
        </button>
        <button
          type="button"
          className="link"
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (!email.trim()) throw new Error('이메일을 입력해 주세요')
              await sendLoginLink(email.trim())
              return `${email} 으로 로그인 링크를 보냈어요. 링크는 이 브라우저에서 열어야 해요. 로그인한 뒤 계정 화면에서 비밀번호를 정할 수 있어요.`
            })
          }
        >
          비밀번호가 없거나 잊었어요 (메일로 로그인 링크 받기)
        </button>
        {msg && <p className="sheet-sub">{msg}</p>}
        {err && <p className="error">{err}</p>}
      </form>
    </Sheet>
  )
}

function PasswordForm() {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!open) return <button className="link" onClick={() => setOpen(true)}>비밀번호 설정/변경</button>
  return (
    <form
      className="login"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await setPassword(pw)
          setMsg('비밀번호를 저장했어요. 다른 기기에서 이 이메일과 비밀번호로 로그인하세요.')
          setPw('')
        } catch (e) {
          setMsg(errText(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      <input type="password" required minLength={6} autoComplete="new-password" placeholder="새 비밀번호 (6자 이상)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="primary" disabled={busy}>저장</button>
      {msg && <p className="sheet-sub">{msg}</p>}
    </form>
  )
}
