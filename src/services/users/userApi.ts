import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

export const USER_BASE = '/api/v1/userDemarcation/user'
export const USER_ROLE_BASE = '/api/v1/userDemarcation/role'
export const USER_SUB_ROLE_BASE = '/api/v1/userDemarcation/subRole'
export const USER_SIGNUP_BASE = '/api/v1/auth/signup'

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
export type UserRole = {
  id: number
  roleName: string
}

export type GetAllUserRolesResponse = ApiResponse<UserRole[]>
export type UserSubRole = {
  id: number
  subRoleName: string
}

export type GetAllSubRolesResponse = ApiResponse<UserSubRole[]>

export type UserActivationResponse = ApiResponse<UserDemarcationUser>

export type UpdateUserRequest = {
  id: number
  roleId: number
  subRoleId: number
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
  roleId: number
  subRoleId: number
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

export type AddUserResponse = ApiResponse<UserDemarcationUser>

export async function getAllUsers(): Promise<GetAllUsersResponse> {
  const res = await http.get<GetAllUsersResponse>(USER_BASE)
  return res.data
}

export async function getAllUserRoles(): Promise<GetAllUserRolesResponse> {
  const res = await http.get<GetAllUserRolesResponse>(USER_ROLE_BASE)
  return res.data
}

export async function getAllSubRoles(): Promise<GetAllSubRolesResponse> {
  const res = await http.get<GetAllSubRolesResponse>(USER_SUB_ROLE_BASE)
  return res.data
}

export async function updateUser(
  body: UpdateUserRequest
): Promise<ApiResponse<UserDemarcationUser>> {
  const res = await http.put<ApiResponse<UserDemarcationUser>>(USER_BASE, body)
  return res.data
}

export async function addUser(body: AddUserRequest): Promise<AddUserResponse> {
  const res = await http.post<AddUserResponse>(USER_SIGNUP_BASE, body)
  return res.data
}

export async function userActivation(
  userId: number
): Promise<UserActivationResponse> {
  const res = await http.delete<UserActivationResponse>(
    `${USER_BASE}/deactivateUser/${userId}`
  )
  return res.data
}
