/**
 * Kakao login callback (Vercel serverless function at /api/kakao).
 *
 * Supabase's built-in Kakao login always asks Kakao for nickname, profile
 * photo and email by name, and Kakao then shows all of them as required, even
 * when the Kakao console marks some as optional. So the app sends people to
 * Kakao itself without a scope (Kakao then follows the console's
 * required/optional settings), and this function swaps the returned code for
 * an OpenID Connect ID token, which the app hands to Supabase.
 *
 * Needs, in Vercel's environment variables:
 *   VITE_KAKAO_REST_KEY   the Kakao REST API key (also used by the app)
 *   KAKAO_CLIENT_SECRET   the Kakao client secret, when it is turned on
 */
export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const url = new URL(req.url, `https://${host}`)
  const state = url.searchParams.get('state') || ''
  // state starts with "app." when the login began in the Android app
  const target = state.startsWith('app.') ? 'com.wtodo.app://auth' : `https://${host}/`

  const back = (params) => {
    res.statusCode = 302
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Location', `${target}#${new URLSearchParams({ ...params, kakao_state: state })}`)
    res.end()
  }

  const code = url.searchParams.get('code')
  if (!code) return back({ kakao_error: url.searchParams.get('error') || 'no_code' })

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.VITE_KAKAO_REST_KEY || '',
    redirect_uri: `https://${host}/api/kakao`,
    code,
  })
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET)

  try {
    const r = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
    })
    const t = await r.json()
    if (!t.id_token) return back({ kakao_error: t.error_description || t.error || 'no_id_token' })
    back({ kakao_id_token: t.id_token, kakao_access_token: t.access_token || '' })
  } catch (e) {
    back({ kakao_error: String(e) })
  }
}
