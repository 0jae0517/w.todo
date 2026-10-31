import { supabase } from './supabase'

/**
 * Kakao login without Supabase's fixed scopes (see api/kakao.js): with no
 * scope in the request, Kakao's consent screen follows the console's
 * required/optional settings, so nickname and photo can stay optional.
 * Turned on by setting VITE_KAKAO_REST_KEY; without it the app falls back to
 * Supabase's own Kakao login.
 */
const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY as string | undefined
export const kakaoDirect = !!REST_KEY

const STATE_KEY = 'todo-app:kakao-state'

/** Kakao's login page. `site` is the web address hosting api/kakao, ending in '/'. */
export function kakaoLoginUrl(site: string, native: boolean) {
  const state = (native ? 'app.' : 'web.') + crypto.randomUUID()
  try {
    localStorage.setItem(STATE_KEY, state)
  } catch {
    /* storage blocked: the state check below is skipped */
  }
  return (
    'https://kauth.kakao.com/oauth/authorize?' +
    new URLSearchParams({ client_id: REST_KEY!, redirect_uri: site + 'api/kakao', response_type: 'code', state })
  )
}

/**
 * Finishes a Kakao login from the fragment api/kakao sent back. Returns false
 * when the fragment isn't from Kakao; throws with a message to show on failure.
 */
export async function finishKakaoLogin(fragment: string): Promise<boolean> {
  const p = new URLSearchParams(fragment.replace(/^#/, ''))
  const token = p.get('kakao_id_token')
  const error = p.get('kakao_error')
  if (!token && !error) return false

  let expected: string | null = null
  try {
    expected = localStorage.getItem(STATE_KEY)
    localStorage.removeItem(STATE_KEY)
  } catch {
    /* ignore */
  }
  if (error) {
    if (error === 'access_denied') return true // the person pressed cancel
    throw new Error('카카오 로그인에 실패했어요: ' + error)
  }
  if (expected && p.get('kakao_state') !== expected) throw new Error('카카오 로그인이 만료됐어요. 다시 시도해 주세요.')

  const { error: e } = await supabase!.auth.signInWithIdToken({
    provider: 'kakao',
    token: token!,
    access_token: p.get('kakao_access_token') || undefined,
  })
  if (e) throw new Error('카카오 로그인에 실패했어요: ' + e.message)
  return true
}
