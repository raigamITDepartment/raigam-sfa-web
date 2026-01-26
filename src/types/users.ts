import type { ApiResponse } from './common'

export type UserDemarcationUser = {
  id: number
  roleId: number
  userGroupId?: number
  userGroupName?: string
  roleName?: string
  subRoleId: number
  subRoleName?: string
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

export type UserRole = {
  id: number
  userGroupName?: string
  roleName?: string
}

export type UserSubRole = {
  id: number
  userGroupId?: number | null
  userGroupName?: string | null
  roleName?: string
  subRoleName?: string
}

export type UpdateUserRequest = {
  id: number
  userGroupId: number
  roleId: number
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
}

export type AddUserRequest = {
  userGroupId: number
  roleId: number
  departmentId: number | null
  continentId: number | null
  countryId: number | null
  channelId: number | null
  subChannelId: number | null
  regionId: number | null
  areaId: number | null
  territoryId: number | null
  agencyId: number | null
  userLevelId: number
  userName: string
  firstName: string
  lastName: string
  perContact: string | null
  email: string
  password: string
  mobileNo: string
  gpsStatus: boolean
  isActive: boolean
  superUserId: number | null
}

export type GetAllUsersResponse = ApiResponse<UserDemarcationUser[]>
export type GetAllUserRolesResponse = ApiResponse<UserRole[]>
export type GetAllRolesResponse = ApiResponse<UserSubRole[]>
export type UserActivationResponse = ApiResponse<UserDemarcationUser>
export type AddUserResponse = ApiResponse<UserDemarcationUser>
