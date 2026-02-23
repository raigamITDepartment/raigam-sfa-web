import { USER_DEMARC_BASE } from './api'
import { del, get, post, put } from './crud'
import type {
  Id,
  ChannelDTO,
  SubChannelDTO,
  RegionDTO,
  DepartmentDTO,
  TerritoryDTO,
  AreaDTO,
  AreaRegionDTO,
  RangeDTO,
  RouteDTO,
  OutletCategoryDTO,
  OutletDTO,
  AgencyDTO,
  AgencyDistributorDTO,
  AgencyWarehouseDTO,
  CreateAgencyWarehouseRequest,
  UpdateAgencyWarehouseRequest,
  CreateAgencyRequest,
  UpdateAgencyRequest,
  CreateAgencyMappingRequest,
  UpdateAgencyMappingRequest,
  CreateAgencyDistributorMappingRequest,
  UpdateAgencyDistributorMappingRequest,
  DistributorDTO,
  CountryDTO,
  UserAgencyDTO,
  UserAreaDTO,
  UserChannelDTO,
  UserContinentDTO,
  UserCountryDTO,
  UserRegionDTO,
  UserRouteDTO,
  UserSubChannelDTO,
  UserTerritoryDTO,
  UserTypeDTO,
  UserDetailsDTO,
  FinalGeoDTO,
  CreateChannelRequest,
  UpdateChannelRequest,
  CreateSubChannelRequest,
  UpdateSubChannelRequest,
  CreateRegionRequest,
  UpdateRegionRequest,
  CreateTerritoryRequest,
  UpdateTerritoryRequest,
  CreateAreaRequest,
  UpdateAreaRequest,
  CreateAreaRegionMappingRequest,
  UpdateAreaRegionRequest,
  CreateRouteRequest,
  UpdateRouteRequest,
  CreateDistributorRequest,
  UpdateDistributorRequest,
} from './types'
import type { UserDemarcationUser } from '@/types/users'

export function getAllChannel() {
  return get<ChannelDTO[]>(`${USER_DEMARC_BASE}/channel`)
}

export function createChannel(body: CreateChannelRequest) {
  return post<ChannelDTO, CreateChannelRequest>(
    `${USER_DEMARC_BASE}/channel`,
    body
  )
}

export function updateChannel(body: UpdateChannelRequest) {
  return put<ChannelDTO, UpdateChannelRequest>(
    `${USER_DEMARC_BASE}/channel`,
    body
  )
}

export function createSubChannel(body: CreateSubChannelRequest) {
  return post<SubChannelDTO, CreateSubChannelRequest>(
    `${USER_DEMARC_BASE}/subChannel`,
    body
  )
}

export function toggleChannelActive(id: Id) {
  return del<ChannelDTO>(`${USER_DEMARC_BASE}/channel/deactivateChannel/${id}`)
}

export function getAllSubChannel() {
  return get<SubChannelDTO[]>(`${USER_DEMARC_BASE}/subChannel`)
}

export function getAllSubChannelsByChannelId(channelId: Id) {
  return get<SubChannelDTO[]>(
    `${USER_DEMARC_BASE}/subChannel/byChannelId/${channelId}`
  )
}

export function updateSubChannel(body: UpdateSubChannelRequest) {
  return put<SubChannelDTO, UpdateSubChannelRequest>(
    `${USER_DEMARC_BASE}/subChannel`,
    body
  )
}

export function deactivateSubChannel(channelId: Id) {
  return del<SubChannelDTO>(
    `${USER_DEMARC_BASE}/subChannel/deactivateSubChannel/${channelId}`
  )
}

export function getAllRegion() {
  return get<RegionDTO[]>(`${USER_DEMARC_BASE}/region`)
}

export function createRegion(body: CreateRegionRequest) {
  return post<RegionDTO, CreateRegionRequest>(
    `${USER_DEMARC_BASE}/region`,
    body
  )
}

export function updateRegion(body: UpdateRegionRequest) {
  return put<RegionDTO, UpdateRegionRequest>(`${USER_DEMARC_BASE}/region`, body)
}

export function deactivateRegion(id: Id) {
  return del<RegionDTO>(`${USER_DEMARC_BASE}/region/deactivateRegion/${id}`)
}

export function getAllDepartment() {
  return get<DepartmentDTO[]>(`${USER_DEMARC_BASE}/department`)
}

export function getAllTerritories() {
  return get<TerritoryDTO[]>(`${USER_DEMARC_BASE}/territory`)
}

export function getTerritoriesByAreaId(areaId: Id) {
  return get<TerritoryDTO[]>(`${USER_DEMARC_BASE}/territory/byAreaId/${areaId}`)
}

export function createTerritory(body: CreateTerritoryRequest) {
  return post<TerritoryDTO, CreateTerritoryRequest>(
    `${USER_DEMARC_BASE}/territory`,
    body
  )
}

export function updateTerritory(body: UpdateTerritoryRequest) {
  return put<TerritoryDTO, UpdateTerritoryRequest>(
    `${USER_DEMARC_BASE}/territory`,
    body
  )
}

export function deactivateTerritory(id: Id) {
  return del<TerritoryDTO>(
    `${USER_DEMARC_BASE}/territory/deactivateTerritory/${id}`
  )
}

export function getAllArea() {
  return get<AreaDTO[]>(`${USER_DEMARC_BASE}/area`)
}

export function getAreasBySubChannelId(subChannelId: Id) {
  return get<AreaDTO[]>(
    `${USER_DEMARC_BASE}/area/getAreasBySubChannelId/${subChannelId}`
  )
}

export function createArea(body: CreateAreaRequest) {
  return post<AreaDTO, CreateAreaRequest>(`${USER_DEMARC_BASE}/area`, body)
}

export function updateArea(body: UpdateAreaRequest) {
  return put<AreaDTO, UpdateAreaRequest>(`${USER_DEMARC_BASE}/area`, body)
}

export function deactivateArea(id: Id) {
  return del<AreaDTO>(`${USER_DEMARC_BASE}/area/deactivateArea/${id}`)
}

export function getAllAreaRegions() {
  return get<AreaRegionDTO[]>(`${USER_DEMARC_BASE}/areaRegions`)
}

export function createNewAreaRegionMapping(
  body: CreateAreaRegionMappingRequest
) {
  return post<AreaRegionDTO, CreateAreaRegionMappingRequest>(
    `${USER_DEMARC_BASE}/areaRegions`,
    body
  )
}

export function updateAreaRegion(body: UpdateAreaRegionRequest) {
  return put<AreaRegionDTO, UpdateAreaRegionRequest>(
    `${USER_DEMARC_BASE}/areaRegions`,
    body
  )
}

export function deactivateAreaRegion(id: Id) {
  return del<AreaRegionDTO>(
    `${USER_DEMARC_BASE}/areaRegions/deactivateAreaRegion/${id}`
  )
}

export function getAllRange() {
  return get<RangeDTO[]>(`${USER_DEMARC_BASE}/range`)
}

export function getAllRoutes() {
  return get<RouteDTO[]>(`${USER_DEMARC_BASE}/route`)
}

export function getRoutesByTerritoryId(territoryId: Id) {
  return get<RouteDTO[]>(
    `${USER_DEMARC_BASE}/route/byTerritoryId/${territoryId}`
  )
}

export function createRoute(body: CreateRouteRequest) {
  return post<RouteDTO, CreateRouteRequest>(`${USER_DEMARC_BASE}/route`, body)
}

export function updateRoute(body: UpdateRouteRequest) {
  return put<RouteDTO, UpdateRouteRequest>(`${USER_DEMARC_BASE}/route`, body)
}

export function deactivateRoute(id: Id) {
  return del<RouteDTO>(`${USER_DEMARC_BASE}/route/deactivateRoute/${id}`)
}

export function activateRoute(id: Id) {
  return put<RouteDTO, void>(
    `${USER_DEMARC_BASE}/route/activateRoute/${id}`,
    undefined
  )
}

export function getAllOutletCategory() {
  return get<OutletCategoryDTO[]>(`${USER_DEMARC_BASE}/outlet_category`)
}

export function getAllOutlets() {
  return get<OutletDTO[]>(`${USER_DEMARC_BASE}/outlet`)
}

export function getAllOutletsByTerritoryId(territoryId: Id) {
  return get<OutletDTO[]>(
    `${USER_DEMARC_BASE}/outlet/getAllOutletsByTerritoryId/${territoryId}`
  )
}

export function getAllOutletsByRouteId(routeId: Id) {
  return get<OutletDTO[]>(
    `${USER_DEMARC_BASE}/outlet/getAllOutletsByRouteId/${routeId}`
  )
}

export type GetAllOutletsByRequiredArgsParams = {
  channelId: Id
  subChannelId: Id
  areaId: Id
  territoryId: Id
  routeId: Id
}

export function getAllOutletsByRequiredArgs({
  channelId,
  subChannelId,
  areaId,
  territoryId,
  routeId,
}: GetAllOutletsByRequiredArgsParams) {
  return get<OutletDTO[]>(
    `${USER_DEMARC_BASE}/outlet/getAllOutletsByRequiredArgs?channelId=${channelId}&subChannelId=${subChannelId}&areaId=${areaId}&territoryId=${territoryId}&routeId=${routeId}`
  )
}

export function findOutletById(outletId: Id) {
  return get<OutletDTO>(`${USER_DEMARC_BASE}/outlet/findById/${outletId}`)
}

export function approvalOutlet(outletId: Id) {
  return put<OutletDTO, void>(
    `${USER_DEMARC_BASE}/outlet/approvalOutletById?outletId=${outletId}`,
    undefined
  )
}

export function deactivateOutlet(outletId: Id) {
  return del<OutletDTO>(`${USER_DEMARC_BASE}/outlet/deactivateOutlet/${outletId}`)
}

export type UpdateOutletRequest = {
  id: Id
  userId: Id
  outletCategoryId: Id
  routeId: Id
  rangeId: Id
  outletName: string
  address1: string
  address2?: string
  address3?: string
  ownerName: string
  mobileNo: string
  latitude: number | string
  longitude: number | string
  displayOrder: number | string
  openTime: string
  closeTime: string
  isNew: boolean
  isApproved: boolean
  isClose: boolean
  vatNum?: string | number
  outletSequence?: number | string
}

export function updateOutlet(body: UpdateOutletRequest | FormData) {
  return put<OutletDTO, UpdateOutletRequest | FormData>(
    `${USER_DEMARC_BASE}/outlet`,
    body
  )
}

export function getAllAgency() {
  return get<AgencyDTO[]>(`${USER_DEMARC_BASE}/agency`)
}

export function toggleAgencyActive(id: Id) {
  return del<AgencyDTO>(`${USER_DEMARC_BASE}/agency/deactivateAgency/${id}`)
}

export function createAgency(body: CreateAgencyRequest) {
  return post<AgencyDTO, CreateAgencyRequest>(
    `${USER_DEMARC_BASE}/agency`,
    body
  )
}

export function updateAgency(body: UpdateAgencyRequest) {
  return put<AgencyDTO, UpdateAgencyRequest>(`${USER_DEMARC_BASE}/agency`, body)
}

export function createNewAgencyMapping(body: CreateAgencyMappingRequest) {
  return createAgency(body)
}

export function createAgencyDistributorMapping(
  body: CreateAgencyDistributorMappingRequest
) {
  return post<unknown, CreateAgencyDistributorMappingRequest>(
    `${USER_DEMARC_BASE}/agencyDistributor`,
    body
  )
}

export function getAllAgencyDistributors() {
  return get<AgencyDistributorDTO[]>(`${USER_DEMARC_BASE}/agencyDistributor`)
}

export function updateActiveStatusAgencyDistributor(id: Id) {
  return del<AgencyDistributorDTO>(
    `${USER_DEMARC_BASE}/agencyDistributor/deactivateAgencyDistributor/${id}`
  )
}

export function updateAgencyDistributorMapping(
  body: UpdateAgencyDistributorMappingRequest
) {
  return put<AgencyDistributorDTO, UpdateAgencyDistributorMappingRequest>(
    `${USER_DEMARC_BASE}/agencyDistributor`,
    body
  )
}

export function updateAgencyMapping(body: UpdateAgencyMappingRequest) {
  return updateAgency(body)
}

export function deactivateAgencyMapping(id: Id) {
  return toggleAgencyActive(id)
}

export function getAllDistributors() {
  return get<DistributorDTO[]>(`${USER_DEMARC_BASE}/distributor`)
}

export function getAllDistributorsByRangeId(rangeId: Id) {
  return get<DistributorDTO[]>(
    `${USER_DEMARC_BASE}/distributor/findAllByRangeId/${rangeId}`
  )
}

export function findDistributorById(distributorId: Id) {
  return get<DistributorDTO>(
    `${USER_DEMARC_BASE}/distributor/findById/${distributorId}`
  )
}

export function createNewDistributor(body: CreateDistributorRequest) {
  return post<DistributorDTO, CreateDistributorRequest>(
    `${USER_DEMARC_BASE}/distributor`,
    body
  )
}

export function updateDistributor(body: UpdateDistributorRequest) {
  return put<DistributorDTO, UpdateDistributorRequest>(
    `${USER_DEMARC_BASE}/distributor`,
    body
  )
}

export function deActivateDistributor(id: Id) {
  return del<DistributorDTO>(
    `${USER_DEMARC_BASE}/distributor/deactivateDistributor/${id}`
  )
}

export function getAllAgencyWarehouse() {
  return get<AgencyWarehouseDTO[]>(`${USER_DEMARC_BASE}/agencyWarehouse`)
}

export function createAgencyWarehouse(body: CreateAgencyWarehouseRequest) {
  return post<AgencyWarehouseDTO, CreateAgencyWarehouseRequest>(
    `${USER_DEMARC_BASE}/agencyWarehouse`,
    body
  )
}

export function createAgencyWarehouseMapping(
  body: CreateAgencyWarehouseRequest
) {
  return createAgencyWarehouse(body)
}

export function updateAgencyWarehouse(body: UpdateAgencyWarehouseRequest) {
  return put<AgencyWarehouseDTO, UpdateAgencyWarehouseRequest>(
    `${USER_DEMARC_BASE}/agencyWarehouse`,
    body
  )
}

export function updateAgencyWarehouseMapping(
  body: UpdateAgencyWarehouseRequest
) {
  return updateAgencyWarehouse(body)
}

export function deActivateAgencyWarehouse(id: Id) {
  return del<AgencyWarehouseDTO>(
    `${USER_DEMARC_BASE}/agencyWarehouse/deactivateAgencyWarehouse/${id}`
  )
}

export function changeStatusAgencyWareHouseMapping(id: Id) {
  return deActivateAgencyWarehouse(id)
}

export function getAllCountrys() {
  return get<CountryDTO[]>(`${USER_DEMARC_BASE}/country`)
}

export function getAllUserAgency() {
  return get<UserAgencyDTO[]>(`${USER_DEMARC_BASE}/user_agency`)
}

export function getAllUserAreas() {
  return get<UserAreaDTO[]>(`${USER_DEMARC_BASE}/user_areas`)
}

export function getAllUserChannels() {
  return get<UserChannelDTO[]>(`${USER_DEMARC_BASE}/user_channel`)
}

export function getAllUserContinent() {
  return get<UserContinentDTO[]>(`${USER_DEMARC_BASE}/user_continent`)
}

export function getAllUserCountry() {
  return get<UserCountryDTO[]>(`${USER_DEMARC_BASE}/user_country`)
}

export function getAllUserRegions() {
  return get<UserRegionDTO[]>(`${USER_DEMARC_BASE}/user_region`)
}

export function getAllUserRoutes() {
  return get<UserRouteDTO[]>(`${USER_DEMARC_BASE}/user_route`)
}

export function getAllUserSubChannels() {
  return get<UserSubChannelDTO[]>(`${USER_DEMARC_BASE}/user_sub_channel`)
}

export function getAllUserTerritory() {
  return get<UserTerritoryDTO[]>(`${USER_DEMARC_BASE}/user_territory`)
}

export function getAllUserTerritoriesByTerritoryId(territoryId: Id) {
  return get<UserDetailsDTO[]>(
    `${USER_DEMARC_BASE}/user_territory/getAllUserTerritoriesByTerritoryId/${territoryId}`
  )
}

export function getAllUserTypes() {
  return get<UserTypeDTO[]>(`${USER_DEMARC_BASE}/user_type`)
}

export function getAllUserDetails() {
  return get<UserDetailsDTO[]>(`${USER_DEMARC_BASE}/usersDetails`)
}

export function findUserDetailsById(userId: Id) {
  return get<UserDemarcationUser>(
    `${USER_DEMARC_BASE}/user/findById/${userId}`
  )
}

export function getFinalGeo() {
  return get<FinalGeoDTO[]>(`${USER_DEMARC_BASE}/finalGeo`)
}

export type GetGpsMonitoringDataParams = {
  userId: Id
  date: string
  startTime: string
  endTime: string
}

export function getGpsMonitoringData({
  userId,
  date,
  startTime,
  endTime,
}: GetGpsMonitoringDataParams) {
  const params = new URLSearchParams({
    userId: String(userId),
    date,
    startTime,
    endTime,
  })
  return get<unknown>(
    `${USER_DEMARC_BASE}/gps/findAllGPSByUserIdAndDateAndTimeRange?${params.toString()}`
  )
}
