import { http } from './http'

export type ApiResponse<T> = {
  code: number
  message: string
  payload: T
}

export type Id = number | string

// Minimal DTOs – extend once backend payloads are finalized
export type ChannelDTO = {
  id: Id
  channelCode: string
  channelName: string
  isActive?: boolean
  active?: boolean
  status?: string
}
export type SubChannelDTO = {
  id: Id
  channelId?: Id
  channelName?: string
  subChannelName: string
  subChannelCode?: string
  isActive?: boolean
  active?: boolean
  status?: string
}
export type RegionDTO = {
  id: Id
  regionName?: string
  name?: string
  channelId?: Id
  channelName?: string
  subChannelId?: Id
  subChannelName?: string
  regionCode?: string
  isActive?: boolean
  active?: boolean
  status?: string
}
export type DepartmentDTO = { id: Id; name: string }
export type TerritoryDTO = { id: Id; name: string }
export type AreaDTO = {
  id: Id
  areaName: string
  areaCode?: string
  displayOrder?: number
  isActive?: boolean
  active?: boolean
  status?: string
}
export type AreaRegionDTO = { id: Id; name: string }
export type RangeDTO = { id: Id; rangeName: string }
export type RouteDTO = { id: Id; name: string }
export type OutletCategoryDTO = { id: Id; name: string }
export type OutletDTO = { id: Id; name: string }
export type AgencyDTO = { id: Id; name: string }
export type DistributorDTO = { id: Id; name: string }
export type CountryDTO = {
  id: Id
  continentId: Id
  countryName: string
  countryCode: string
  active: boolean
}

// User-scoped lists
export type UserAgencyDTO = { id: Id; name: string }
export type UserAreaDTO = { id: Id; name: string }
export type UserChannelDTO = { id: Id; name: string }
export type UserContinentDTO = { id: Id; name: string }
export type UserCountryDTO = { id: Id; name: string }
export type UserRegionDTO = { id: Id; name: string }
export type UserRouteDTO = { id: Id; name: string }
export type UserSubChannelDTO = { id: Id; name: string }
export type UserTerritoryDTO = { id: Id; name: string }
export type UserTypeDTO = { id: Id; name: string }
export type UserDetailsDTO = { id: Id; name: string }

const USER_DEMARC_BASE = '/api/v1/userDemarcation'

export async function getAllChannel() {
  const res = await http.get<ApiResponse<ChannelDTO[]>>(
    `${USER_DEMARC_BASE}/channel`
  )
  return res.data
}

export type CreateChannelRequest = {
  userId: Id
  countryId: Id
  channelName: string
  channelCode: string
  isActive: boolean
}

export async function createChannel(body: CreateChannelRequest) {
  const res = await http.post<ApiResponse<ChannelDTO>>(
    `${USER_DEMARC_BASE}/channel`,
    body
  )
  return res.data
}

export type UpdateChannelRequest = CreateChannelRequest & { id: Id }

export async function updateChannel(body: UpdateChannelRequest) {
  const res = await http.put<ApiResponse<ChannelDTO>>(
    `${USER_DEMARC_BASE}/channel`,
    body
  )
  return res.data
}

export type CreateSubChannelRequest = {
  channelId: Id
  userId: Id
  subChannelName: string
  subChannelCode: string
  isActive: boolean
}
export type UpdateSubChannelRequest = {
  id: Id
  channelId: Id
  userId: Id
  subChannelName: string
  subChannelCode: string
  isActive: boolean
}

export async function createSubChannel(body: CreateSubChannelRequest) {
  const res = await http.post<ApiResponse<SubChannelDTO>>(
    `${USER_DEMARC_BASE}/subChannel`,
    body
  )
  return res.data
}

export async function toggleChannelActive(id: Id) {
  const res = await http.delete<ApiResponse<ChannelDTO>>(
    `${USER_DEMARC_BASE}/channel/deactivateChannel/${id}`
  )
  return res.data
}

export async function getAllSubChannel() {
  const res = await http.get<ApiResponse<SubChannelDTO[]>>(
    `${USER_DEMARC_BASE}/subChannel`
  )
  return res.data
}

export async function updateSubChannel(body: UpdateSubChannelRequest) {
  const res = await http.put<ApiResponse<SubChannelDTO>>(
    `${USER_DEMARC_BASE}/subChannel`,
    body
  )
  return res.data
}

export async function deactivateSubChannel(channelId: Id) {
  const res = await http.delete<ApiResponse<SubChannelDTO>>(
    `${USER_DEMARC_BASE}/subChannel/deactivateSubChannel/${channelId}`
  )
  return res.data
}

export async function getAllRegion() {
  const res = await http.get<ApiResponse<RegionDTO[]>>(
    `${USER_DEMARC_BASE}/region`
  )
  return res.data
}

export type CreateRegionRequest = {
  userId: Id
  channelId: Id
  subChannelId?: Id
  regionName: string
  regionCode: string
  isActive: boolean
}
export type UpdateRegionRequest = CreateRegionRequest & { id: Id }

export async function createRegion(body: CreateRegionRequest) {
  const res = await http.post<ApiResponse<RegionDTO>>(
    `${USER_DEMARC_BASE}/region`,
    body
  )
  return res.data
}

export async function updateRegion(body: UpdateRegionRequest) {
  const res = await http.put<ApiResponse<RegionDTO>>(
    `${USER_DEMARC_BASE}/region`,
    body
  )
  return res.data
}

export async function deactivateRegion(id: Id) {
  const res = await http.delete<ApiResponse<RegionDTO>>(
    `${USER_DEMARC_BASE}/region/deactivateRegion/${id}`
  )
  return res.data
}

export async function getAllDepartment() {
  const res = await http.get<ApiResponse<DepartmentDTO[]>>(
    `${USER_DEMARC_BASE}/department`
  )
  return res.data
}

export async function getAllTerritories() {
  const res = await http.get<ApiResponse<TerritoryDTO[]>>(
    `${USER_DEMARC_BASE}/territory`
  )
  return res.data
}

export async function getAllArea() {
  const res = await http.get<ApiResponse<AreaDTO[]>>(`${USER_DEMARC_BASE}/area`)
  return res.data
}

export type CreateAreaRequest = {
  userId: Id
  areaName: string
  areaCode: string
  displayOrder: number
  isActive: boolean
}
export type UpdateAreaRequest = CreateAreaRequest & { id: Id }

export async function createArea(body: CreateAreaRequest) {
  const res = await http.post<ApiResponse<AreaDTO>>(
    `${USER_DEMARC_BASE}/area`,
    body
  )
  return res.data
}

export async function updateArea(body: UpdateAreaRequest) {
  const res = await http.put<ApiResponse<AreaDTO>>(
    `${USER_DEMARC_BASE}/area`,
    body
  )
  return res.data
}

export async function deactivateArea(id: Id) {
  const res = await http.delete<ApiResponse<AreaDTO>>(
    `${USER_DEMARC_BASE}/area/deactivateArea/${id}`
  )
  return res.data
}

export async function getAllAreaRegions() {
  const res = await http.get<ApiResponse<AreaRegionDTO[]>>(
    `${USER_DEMARC_BASE}/areaRegions`
  )
  return res.data
}

export async function getAllRange() {
  const res = await http.get<ApiResponse<RangeDTO[]>>(
    `${USER_DEMARC_BASE}/range`
  )
  return res.data
}

export async function getAllRoutes() {
  const res = await http.get<ApiResponse<RouteDTO[]>>(
    `${USER_DEMARC_BASE}/route`
  )
  return res.data
}

export async function getAllOutletCategory() {
  const res = await http.get<ApiResponse<OutletCategoryDTO[]>>(
    `${USER_DEMARC_BASE}/outlet_category`
  )
  return res.data
}

export async function getAllOutlets() {
  const res = await http.get<ApiResponse<OutletDTO[]>>(
    `${USER_DEMARC_BASE}/outlet`
  )
  return res.data
}

export async function getAllAgency() {
  const res = await http.get<ApiResponse<AgencyDTO[]>>(
    `${USER_DEMARC_BASE}/agency`
  )
  return res.data
}

export async function getAllDistributors() {
  const res = await http.get<ApiResponse<DistributorDTO[]>>(
    `${USER_DEMARC_BASE}/distributor`
  )
  return res.data
}

export async function getAllCountrys() {
  const res = await http.get<ApiResponse<CountryDTO[]>>(
    `${USER_DEMARC_BASE}/country`
  )
  return res.data
}

export async function getAllUserAgency() {
  const res = await http.get<ApiResponse<UserAgencyDTO[]>>(
    `${USER_DEMARC_BASE}/user_agency`
  )
  return res.data
}

export async function getAllUserAreas() {
  const res = await http.get<ApiResponse<UserAreaDTO[]>>(
    `${USER_DEMARC_BASE}/user_areas`
  )
  return res.data
}

export async function getAllUserChannels() {
  const res = await http.get<ApiResponse<UserChannelDTO[]>>(
    `${USER_DEMARC_BASE}/user_channel`
  )
  return res.data
}

export async function getAllUserContinent() {
  const res = await http.get<ApiResponse<UserContinentDTO[]>>(
    `${USER_DEMARC_BASE}/user_continent`
  )
  return res.data
}

export async function getAllUserCountry() {
  const res = await http.get<ApiResponse<UserCountryDTO[]>>(
    `${USER_DEMARC_BASE}/user_country`
  )
  return res.data
}

export async function getAllUserRegions() {
  const res = await http.get<ApiResponse<UserRegionDTO[]>>(
    `${USER_DEMARC_BASE}/user_region`
  )
  return res.data
}

export async function getAllUserRoutes() {
  const res = await http.get<ApiResponse<UserRouteDTO[]>>(
    `${USER_DEMARC_BASE}/user_route`
  )
  return res.data
}

export async function getAllUserSubChannels() {
  const res = await http.get<ApiResponse<UserSubChannelDTO[]>>(
    `${USER_DEMARC_BASE}/user_sub_channel`
  )
  return res.data
}

export async function getAllUserTerritory() {
  const res = await http.get<ApiResponse<UserTerritoryDTO[]>>(
    `${USER_DEMARC_BASE}/user_territory`
  )
  return res.data
}

export async function getAllUserTypes() {
  const res = await http.get<ApiResponse<UserTypeDTO[]>>(
    `${USER_DEMARC_BASE}/user_type`
  )
  return res.data
}

export async function getAllUserDetails() {
  const res = await http.get<ApiResponse<UserDetailsDTO[]>>(
    `${USER_DEMARC_BASE}/usersDetails`
  )
  return res.data
}
