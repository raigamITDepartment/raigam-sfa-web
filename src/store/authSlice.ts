import type { LoginRequest } from '@/services/authApi'
import type { LoginResponsePayload } from '@/types/auth'
import * as authApi from '@/services/authApi'
import { getFirebaseAuth } from '@/services/firebase'
import { signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { clearAllCookies } from '@/lib/cookies'
import {
  setAccessToken,
  setRefreshToken,
  clearAllTokens,
  getRefreshToken,
  setRememberPreference,
  clearRememberPreference,
  getRememberPreference,
} from '@/services/tokenService'
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'

// Role-based mapping removed

export type AuthUser = LoginResponsePayload

type AuthState = {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated'
  effectivePermissions: string[]
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  effectivePermissions: [],
}

const AUTH_USER_KEY = 'auth_user'

function clearBrowserStorage() {
  try {
    localStorage.clear()
  } catch {
    /* noop */
  }
  try {
    sessionStorage.clear()
  } catch {
    /* noop */
  }
}

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

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest & { remember?: boolean }) => {
    const res = await authApi.login(payload)
    const p = res.payload
    // Store access token and its expiry duration (ms)
    setAccessToken(p.token, p.accessTokenExpiry)
    // Persist remember preference for future refreshes
    setRememberPreference(!!payload.remember)
    // If remember is true, persist refresh cookie with API expiry; otherwise use session cookie
    setRefreshToken(p.refreshToken, p.refreshTokenExpiry, !payload.remember)
    const user: AuthUser = p
    setStoredUser(user)
    const firebaseToken =
      p.firebaseCustomToken ?? p.firebaseToken ?? p.customToken
    if (firebaseToken) {
      await signInWithCustomToken(getFirebaseAuth(), firebaseToken)
    } else {
      const auth = getFirebaseAuth()
      const fixedEmail = import.meta.env.VITE_FIREBASE_LOGIN_EMAIL
      const fixedPassword = import.meta.env.VITE_FIREBASE_LOGIN_PASSWORD
      const fallbackDomain = import.meta.env.VITE_FIREBASE_LOGIN_DOMAIN
      const email =
        fixedEmail ||
        (payload.userName.includes('@')
          ? payload.userName
          : fallbackDomain
            ? `${payload.userName}@${fallbackDomain}`
            : null)
      if (email) {
        try {
          await signInWithEmailAndPassword(
            auth,
            email,
            fixedPassword ?? payload.password
          )
        } catch (err) {
          console.warn('Firebase email/password sign-in failed', err)
        }
      } else {
        console.warn(
          'Firebase sign-in skipped: no custom token and username is not an email.'
        )
      }
    }
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
    // API may return `accessToken` (preferred) or `token`
    const newAccess = p.accessToken ?? p.token
    if (!newAccess) throw new Error('Invalid refresh payload')
    setAccessToken(newAccess, p.accessTokenExpiry)
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

    // Restore user from storage if available
    const stored = getStoredUser()
    if (stored) {
      return { user: stored }
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
      clearBrowserStorage()
      clearAllCookies()
      void signOut(getFirebaseAuth())
      state.user = null
      state.status = 'idle'
      state.effectivePermissions = []
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'idle'
      state.effectivePermissions = action.payload?.permissions ?? []
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
        state.effectivePermissions = action.payload.user.permissions ?? []
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
          state.effectivePermissions = action.payload.user.permissions ?? []
        }
      })
  },
})

export const { logout, setUser } = authSlice.actions
export default authSlice.reducer
