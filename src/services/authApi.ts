import { http } from './http'
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '@/types/auth'

export async function login(data: LoginRequest) {
  const res = await http.post<LoginResponse>('/api/v1/auth/login', data)
  return res.data
}

export async function refresh(refreshToken: string) {
  const res = await http.post<RefreshResponse>('/api/v1/auth/refresh', {
    refreshToken,
  })
  return res.data
}

// Re-export types for backwards compatibility
export type { LoginRequest, LoginResponse, RefreshResponse } from '@/types/auth'
