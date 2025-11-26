import { http } from './http'

export type LoginRequest = {
  userName: string
  password: string
}

export type LoginResponse = {
  code: number
  message: string
  payload: {
    token: string
    accessTokenExpiry: number
    refreshToken: string
    refreshTokenExpiry: number
    userId: number
    roleId: number
    role: string
    subRoleId: number
    subRole: string
    userTypeId: number
    userType: string
    rangeId: number
    range: string
    areaIds: number[]
    territoryId: number
    territoryName: string
    distributorId: number
    distributorName: string
    userAgencyId: number
    agencyTerritoryId: number
    agencyWarehouseId: number
    agencyCode: number
    agencyName: string
    userName: string
    personalName: string
    gpsStatus: boolean
    serverTime: string
  }
}

export async function login(data: LoginRequest) {
  const res = await http.post<LoginResponse>('/api/v1/auth/login', data)
  console.log('user data:', res.data)
  return res.data
}

export type RefreshResponse = {
  code: number
  message: string
  payload: {
    // Some backends return `accessToken`; others may return `token`
    accessToken?: string
    token?: string
    accessTokenExpiry?: number
    refreshToken?: string
    refreshTokenExpiry?: number
  }
}

export async function refresh(refreshToken: string) {
  const res = await http.post<RefreshResponse>('/api/v1/auth/refresh', {
    refreshToken,
  })
  return res.data
}
