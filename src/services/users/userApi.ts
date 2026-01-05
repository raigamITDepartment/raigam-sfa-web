import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

export const USER_BASE = '/api/v1/userDemarcation/user'

export type UserDemarcationUser = {
  id: number
  roleId: number
  roleName: string
  subRoleId: number
  subRoleName: string
  departmentId: number | null
  continentId: number | null
  countryId: number | null
  channelId: number | null
  subChannelId: number | null
  regionId: number | null
  areaId: number | null
  territoryId: number | null
  agencyId: number | null
  rangeId: number
  userLevelId: number
  userName: string
  firstName: string
  lastName: string
  perContact: string | null
  startDate: string | null
  endDate: string | null
  email: string
  password: string
  mobileNo: string
  gpsStatus: boolean
  isActive: boolean
  superUserId: number | null
  areaList: unknown[] | null
}

export type GetAllUsersResponse = ApiResponse<UserDemarcationUser[]>

export async function getAllUsers(): Promise<GetAllUsersResponse> {
  const res = await http.get<GetAllUsersResponse>(USER_BASE)
  return res.data
}
