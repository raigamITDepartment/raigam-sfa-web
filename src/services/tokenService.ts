import { getCookie, setCookie, setSessionCookie, removeCookie } from '@/lib/cookies'

const REFRESH_COOKIE = 'refresh_token'
const REMEMBER_KEY = 'remember_me_pref'
// Persisted access token storage key
const ACCESS_TOKEN_KEY = 'raigam.sfa.access'
const ACCESS_TOKEN_EXP_AT_KEY = 'raigam.sfa.access.expAt'

let accessToken: string | '' = ''
let accessTokenExpAt: number | undefined = undefined

export function getAccessToken() {
  // If we have an in-memory token, ensure it's not expired
  if (accessToken) {
    if (accessTokenExpAt && Date.now() >= accessTokenExpAt) {
      // Expired; clear and fall through
      clearAccessToken()
    } else {
      return accessToken
    }
  }
  try {
    // Prefer the current app key; fall back to legacy key if present
    const stored =
      localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('access_token')
    const expAtRaw = localStorage.getItem(ACCESS_TOKEN_EXP_AT_KEY)
    const expAt = expAtRaw ? Number(expAtRaw) : undefined
    if (expAt && Date.now() >= expAt) {
      // Stored token expired
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(ACCESS_TOKEN_EXP_AT_KEY)
      accessToken = ''
      accessTokenExpAt = undefined
      return ''
    }
    if (stored) {
      accessToken = stored
      accessTokenExpAt = expAt
      return accessToken
    }
  } catch {
    /* noop */
  }
  return accessToken
}

export function setAccessToken(token: string, maxAgeMs?: number) {
  accessToken = token || ''
  accessTokenExpAt = undefined
  try {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      if (typeof maxAgeMs === 'number' && isFinite(maxAgeMs)) {
        accessTokenExpAt = Date.now() + Math.max(0, Math.floor(maxAgeMs))
        localStorage.setItem(ACCESS_TOKEN_EXP_AT_KEY, String(accessTokenExpAt))
      } else {
        localStorage.removeItem(ACCESS_TOKEN_EXP_AT_KEY)
      }
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(ACCESS_TOKEN_EXP_AT_KEY)
    }
  } catch {
    /* noop */
  }
}

export function clearAccessToken() {
  accessToken = ''
  accessTokenExpAt = undefined
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(ACCESS_TOKEN_EXP_AT_KEY)
  } catch {
    /* noop */
  }
}

export function getRefreshToken(): string | undefined {
  return getCookie(REFRESH_COOKIE)
}

export function setRefreshToken(token: string, maxAgeMs?: number, session: boolean = false) {
  // Best-effort cookie; server-set httpOnly cookie is preferable
  if (session) {
    setSessionCookie(REFRESH_COOKIE, token)
    return
  }
  const maxAge = maxAgeMs ? Math.floor(maxAgeMs / 1000) : undefined
  if (typeof maxAge === 'number') setCookie(REFRESH_COOKIE, token, maxAge)
  else setCookie(REFRESH_COOKIE, token)
}

export function clearRefreshToken() {
  removeCookie(REFRESH_COOKIE)
}

export function clearAllTokens() {
  clearAccessToken()
  clearRefreshToken()
}

// Remember-me preference helpers
export function setRememberPreference(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    /* noop */
  }
}

export function getRememberPreference(): boolean {
  try {
    const v = localStorage.getItem(REMEMBER_KEY)
    return v === '1'
  } catch {
    return false
  }
}

export function clearRememberPreference() {
  try {
    localStorage.removeItem(REMEMBER_KEY)
  } catch {
    /* noop */
  }
}
