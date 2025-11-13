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

let isRefreshing = false
let pendingRequests: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  pendingRequests.forEach((cb) => cb(token))
  pendingRequests = []
}

function addPendingRequest(cb: (token: string) => void) {
  pendingRequests.push(cb)
}

async function refreshAccessToken(instance: AxiosInstance) {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  const res = await instance.post('/api/v1/auth/refresh', { refreshToken })
  const payload = res.data?.payload
  if (!payload?.token) throw new Error('Invalid refresh payload')
  setAccessToken(payload.token)
  if (payload.refreshToken && payload.refreshTokenExpiry) {
    const session = !getRememberPreference()
    setRefreshToken(payload.refreshToken, payload.refreshTokenExpiry, session)
  }
  return payload.token as string
}

export const http = axios.create({ baseURL })

http.interceptors.request.use(async (config) => {
  let token = getAccessToken()
  const isAuthEndpoint = config?.url?.includes('/api/v1/auth/')

  // If no access token yet and this is not an auth endpoint, best-effort refresh
  if (!token && !isAuthEndpoint && !isRefreshing && getRefreshToken()) {
    try {
      isRefreshing = true
      const newToken = await refreshAccessToken(http)
      onRefreshed(newToken)
    } catch {
      // noop; response interceptor will handle auth errors later
    } finally {
      isRefreshing = false
    }
    token = getAccessToken()
  }

  if (token) {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers as any)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status
    const isAuthEndpoint = original?.url?.includes('/api/v1/auth/')

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addPendingRequest((token: string) => {
            const headers =
              original.headers instanceof AxiosHeaders
                ? (original.headers as AxiosHeaders)
                : new AxiosHeaders(original.headers as any)
            headers.set('Authorization', `Bearer ${token}`)
            original.headers = headers
            original._retry = true
            resolve(http(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true
      try {
        const newToken = await refreshAccessToken(http)
        onRefreshed(newToken)
        const headers =
          original.headers instanceof AxiosHeaders
            ? (original.headers as AxiosHeaders)
            : new AxiosHeaders(original.headers as any)
        headers.set('Authorization', `Bearer ${newToken}`)
        original.headers = headers
        return http(original)
      } catch (_e) {
        clearAllTokens()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
