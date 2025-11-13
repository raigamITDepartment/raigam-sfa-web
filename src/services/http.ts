import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearAllTokens,
  getRememberPreference,
} from './tokenService'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://dev-sfa-api-gateway.purplesand-bdf733b9.southeastasia.azurecontainerapps.io'

// Track refresh state
let refreshPromise: Promise<string> | null = null

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(instance: AxiosInstance): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    const res = await instance.post('/api/v1/auth/refresh', { refreshToken })
    const payload = res.data?.payload
    const newAccess = payload?.accessToken ?? payload?.token

    if (!newAccess) throw new Error('Invalid refresh payload')

    // Set new access token and optional expiry if provided
    setAccessToken(newAccess, payload?.accessTokenExpiry)

    if (payload?.refreshToken && payload?.refreshTokenExpiry) {
      const session = !getRememberPreference()
      setRefreshToken(payload.refreshToken, payload.refreshTokenExpiry, session)
    }

    refreshPromise = null
    return newAccess as string
  })()

  return refreshPromise
}

/**
 * Create a centralized Axios instance
 */
export const http = axios.create({
  baseURL,
  // Enable credentials only if your backend uses cookies.
  withCredentials: false,
})

/**
 * Request interceptor — attaches Bearer token
 */
http.interceptors.request.use(async (config) => {
  let token = getAccessToken()
  const isAuthEndpoint = config?.url?.includes('/api/v1/auth/')

  // Try refreshing if token missing but refresh token exists
  if (!token && !isAuthEndpoint && getRefreshToken()) {
    try {
      const newToken = await refreshAccessToken(http)
      token = newToken
    } catch {
      // silently fail; response interceptor handles 401s
    }
  }

  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers

    if (import.meta.env.DEV) {
      console.debug('[http] Attached bearer', token.slice(0, 12) + '…', config.url)
    }
  }

  return config
})

/**
 * Response interceptor — handles 401 and retries requests after refresh
 */
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status
    const isAuthEndpoint = original?.url?.includes('/api/v1/auth/')

    // Handle unauthorized requests (401)
    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true

      try {
        const newToken = await refreshAccessToken(http)

        // Re-attach new token and retry original request
        const headers = AxiosHeaders.from(
          original.headers as unknown as AxiosHeaders | undefined
        )
        headers.set('Authorization', `Bearer ${newToken}`)
        original.headers = headers

        if (import.meta.env.DEV) {
          console.debug('[http] Refreshed bearer', newToken.slice(0, 12) + '…', original.url)
        }

        return http(original)
      } catch (e) {
        clearAllTokens()
        // Optionally redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
        return Promise.reject(e)
      }
    }

    return Promise.reject(error)
  }
)
