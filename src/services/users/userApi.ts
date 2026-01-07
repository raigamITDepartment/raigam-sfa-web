import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'
import type {
  AddUserRequest,
  AddUserResponse,
  GetAllSubRolesResponse,
  GetAllUserRolesResponse,
  GetAllUsersResponse,
  UpdateUserRequest,
  UserActivationResponse,
  UserDemarcationUser,
} from '@/types/users'

export const USER_BASE = '/api/v1/userDemarcation/user'
export const USER_ROLE_BASE = '/api/v1/userDemarcation/role'
export const USER_SUB_ROLE_BASE = '/api/v1/userDemarcation/subRole'
export const USER_SIGNUP_BASE = '/api/v1/auth/signup'

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
