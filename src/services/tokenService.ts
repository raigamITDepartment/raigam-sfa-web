import { getCookie, setCookie, setSessionCookie, removeCookie } from '@/lib/cookies'

const REFRESH_COOKIE = 'refresh_token'
const REMEMBER_KEY = 'remember_me_pref'

let accessToken: string | '' = ''

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string) {
  accessToken = token || ''
}

export function clearAccessToken() {
  accessToken = ''
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
