import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LoginRequest } from '@/services/authApi'
import * as authApi from '@/services/authApi'
import {
  setAccessToken,
  setRefreshToken,
  clearAllTokens,
  getRefreshToken,
  getAccessToken,
  setRememberPreference,
  clearRememberPreference,
  getRememberPreference,
} from '@/services/tokenService'
// Role-based mapping removed

export type AuthUser = {
  userId: number
  userName: string
  personalName: string
  roleId?: number
  role?: string
}

type AuthState = {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated'
  effectivePermissions?: string[]
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
}

const AUTH_USER_KEY = 'auth_user'

function setStoredUser(user: AuthUser) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch {
    /* noop */
  }
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem(AUTH_USER_KEY)
  } catch {
    /* noop */
  }
}

function decodeJwt(token: string): unknown | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest & { remember?: boolean }) => {
    const res = await authApi.login(payload)
    const p = res.payload
    setAccessToken(p.token)
    // Persist remember preference for future refreshes
    setRememberPreference(!!payload.remember)
    // If remember is true, persist refresh cookie with API expiry; otherwise use session cookie
    setRefreshToken(p.refreshToken, p.refreshTokenExpiry, !payload.remember)
    const user: AuthUser = {
      userId: p.userId,
      userName: p.userName,
      personalName: p.personalName,
      roleId: p.roleId,
      role: p.role,
    }
    // Compute permissions via role policy (or switch to server-provided perms later)
    setStoredUser(user)
    return { user }
  }
)

export const hydrateFromRefreshThunk = createAsyncThunk(
  'auth/hydrateFromRefresh',
  async () => {
    const rt = getRefreshToken()
    if (!rt) throw new Error('No refresh token')
    const res = await authApi.refresh(rt)
    const p = res.payload
    setAccessToken(p.token)
    if (p.refreshToken && p.refreshTokenExpiry) {
      // Respect stored remember preference when refreshing
      const session = !getRememberPreference()
      setRefreshToken(p.refreshToken, p.refreshTokenExpiry, session)
    }
    return true
  }
)

export const hydrateOnLoadThunk = createAsyncThunk(
  'auth/hydrateOnLoad',
  async (_, { dispatch }) => {
    try {
      // Attempt to refresh to ensure we have a valid access token
      await dispatch(hydrateFromRefreshThunk()).unwrap()
    } catch {
      // No refresh token or refresh failed; leave as idle
      return null
    }

    // Restore user from storage if available; else derive minimal from JWT
    const stored = getStoredUser()
    if (stored) {
      return { user: stored }
    }
    
    // Fallback: try to derive username from JWT 'sub'
    // Note: This is best-effort and for UI only
    const token = getAccessToken()
    if (token) {
      const info = decodeJwt(token) as { sub?: string } | null
      const sub = info?.sub
      if (sub) {
        const user: AuthUser = {
          userId: 0,
          userName: sub,
          personalName: sub,
          role: undefined,
        }
        setStoredUser(user)
        return { user }
      }
    }
    return null
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearAllTokens()
      clearRememberPreference()
      clearStoredUser()
      state.user = null
      state.status = 'idle'
      state.effectivePermissions = []
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.status = 'authenticated'
      })
      .addCase(loginThunk.rejected, (state) => {
        state.status = 'idle'
      })
      .addCase(hydrateFromRefreshThunk.fulfilled, (_state) => {
        // keep status as-is; token refreshed silently
      })
      .addCase(hydrateOnLoadThunk.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = action.payload.user
          state.status = 'authenticated'
        }
      })
  },
})

export const { logout, setUser } = authSlice.actions
export default authSlice.reducer
