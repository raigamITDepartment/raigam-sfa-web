import type { ApiResponse } from './common'

export type LoginRequest = {
  userName: string
  password: string
}

export type LoginResponsePayload = {
  token: string
  accessTokenExpiry: number
  refreshToken: string
  refreshTokenExpiry: number
  userId: number
  userGroupId?: number
  roleId?: number
  role: string
  subRoleId?: number
  subRole?: string
  subChannelId?: number | null
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
  routeCode?: number | null
  agencyName: string
  userName: string
  personalName: string
  gpsStatus: boolean
  serverTime: string
  permissions?: string[]
  firebaseCustomToken?: string
  firebaseToken?: string
  customToken?: string
}

export type LoginResponse = ApiResponse<LoginResponsePayload>

export type RefreshPayload = {
  // Some backends return `accessToken`; others may return `token`
  accessToken?: string
  token?: string
  accessTokenExpiry?: number
  refreshToken?: string
  refreshTokenExpiry?: number
}

export type RefreshResponse = ApiResponse<RefreshPayload>
