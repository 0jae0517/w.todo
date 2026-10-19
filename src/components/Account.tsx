import { useState } from 'react'
import { sendLoginLink, setPassword, signInWithPassword, signInWithProvider, signUp, type SyncStatus } from '../sync'

export const STATUS_LABEL: Record<SyncStatus, string> = {
  off: '이 기기에만 저장 중',
  'signed-out': '로그인하면 동기화돼요',
  syncing: '동기화 중…',
  synced: '동기화됨',
  offline: '오프라인 (연결되면 자동 동기화)',
  error: '동기화 오류',
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function LoginPanel() {
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
    <div>
      <div className="social">
        <button className="social-btn google" disabled={busy} onClick={() => run(async () => (await signInWithProvider('google'), null))}>
          <GoogleLogo /> Google로 계속하기
        </button>
        <button className="social-btn kakao" disabled={busy} onClick={() => run(async () => (await signInWithProvider('kakao'), null))}>
          <KakaoLogo /> 카카오로 계속하기
        </button>
      </div>
      <div className="or"><span>또는 이메일로</span></div>
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
    </div>
  )
}

export function PasswordForm() {
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

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

const KakaoLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#000" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z" />
  </svg>
)
