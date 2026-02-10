import type { Id } from './common'

export type { ApiResponse, Id } from './common'

// Minimal DTOs - extend once backend payloads are finalized
export type ChannelDTO = {
  id: Id
  channelCode: string
  channelName: string
  countryId?: Id
  enabled?: boolean
  isActive?: boolean
  active?: boolean
  status?: string
}

export type SubChannelDTO = {
  id: Id
  channelId?: Id
  channelName?: string
  channelCode?: string
  subChannelName: string
  shortName?: string
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

export type TerritoryDTO = {
  id: Id
  channelId?: Id
  territoryName?: string
  territoryCode?: string
  name?: string
  subChannelId?: Id
  subChannelName?: string
  rangeId?: Id
  rangeName?: string
  areaId?: Id
  areaName?: string
  areaCode?: string
  displayOrder?: number
  oldTerritoryId?: Id
  isActive?: boolean
  active?: boolean
  status?: string
}

export type AreaDTO = {
  id: Id
  areaName: string
  areaCode?: string
  displayOrder?: number
  isActive?: boolean
  active?: boolean
  status?: string
}

export type AreaRegionDTO = {
  id: Id
  areaId?: Id
  regionId?: Id
  areaName?: string
  regionName?: string
  displayOrder?: number
  isActive?: boolean
  active?: boolean
  status?: string
}

export type RangeDTO = {
  id?: Id
  rangeId?: Id
  rangeName?: string
}

export type RouteDTO = {
  id: Id
  routeCode?: number | string
  routeName?: string
  territoryName?: string
  territoryId?: Id
  areaId?: Id
  areaName?: string
  oldRouteId?: Id
  oldRouteCode?: string
  displayOrder?: number
  isActive?: boolean
  active?: boolean
  status?: string
}

export type OutletCategoryDTO = { id: Id; name: string }

export type OutletDTO = { id: Id; name: string }

export type AgencyDTO = {
  id: Id
  userId?: Id | null
  channelId?: Id | null
  subChannelId?: Id | null
  channelName?: string
  territoryId?: Id | null
  territoryName?: string
  rangeId?: Id | null
  range?: string
  agencyName?: string
  agencyCode?: number | string
  oldAgencyCode?: number | string | null
  bankGuarantee?: string | null
  creditLimit?: number | null
  latitude?: number | null
  longitude?: number | null
  isActive?: boolean
  active?: boolean
  status?: string
}

export type AgencyDistributorDTO = {
  id?: Id
  agencyId?: Id | null
  distributorId?: Id | null
  userId?: Id | null
  agencyName?: string
  agencyCode?: number | string
  distributorName?: string
  channelId?: Id | null
  channelName?: string
  territoryId?: Id | null
  territoryName?: string
  rangeId?: Id | null
  range?: string
  rangeName?: string
  isActive?: boolean
  active?: boolean
  status?: string
}

export type AgencyWarehouseDTO = {
  id: Id
  agencyId?: Id
  agencyName?: string
  warehouseId?: Id
  warehouseName?: string
  sapAgencyCode?: string
  rangeId?: Id
  range?: string
  distributorId?: Id
  distributorName?: string
  userId?: Id | null
  latitude?: number
  longitude?: number
  isActive?: boolean
  active?: boolean
  status?: string
}

export type CreateAgencyWarehouseRequest = {
  userId: Id
  distributorId: Id
  warehouseName: string
  latitude: number
  longitude: number
  sapAgencyCode: string
  isActive: boolean
}

export type UpdateAgencyWarehouseRequest = CreateAgencyWarehouseRequest & { id: Id }

export type CreateAgencyRequest = {
  userId: Id
  channelId: Id
  subChannelId?: Id
  territoryId: Id
  agencyName: string
  agencyCode: number
  oldAgencyCode?: string
  isActive: boolean
}

export type UpdateAgencyRequest = CreateAgencyRequest & { id: Id }

export type CreateAgencyMappingRequest = CreateAgencyRequest

export type UpdateAgencyMappingRequest = UpdateAgencyRequest

export type CreateAgencyDistributorMappingRequest = {
  agencyDistributorDTOList: Array<{
    userId: Id
    agencyId: Id
    distributorId: Id
    isActive: boolean
  }>
}

export type UpdateAgencyDistributorMappingRequest = {
  id: Id
  userId: Id
  agencyId: Id
  distributorId: Id
  agencyCode?: number | string | null
  isActive: boolean
}

export type DistributorDTO = {
  id: Id
  rangeId?: number | string
  range?: string
  rangeName?: string
  userId?: Id | null
  distributorName?: string
  email?: string | null
  address1?: string | null
  address2?: string | null
  address3?: string | null
  mobileNo?: string | null
  telNo?: string | null
  vatNum?: string | null
  isActive?: boolean
}

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

export type UserChannelDTO = {
  id: Id
  name?: string
  channelName?: string
}

export type UserContinentDTO = { id: Id; name: string }

export type UserCountryDTO = { id: Id; name: string }

export type UserRegionDTO = { id: Id; name: string }

export type UserRouteDTO = { id: Id; name: string }

export type UserSubChannelDTO = { id: Id; name: string }

export type UserTerritoryDTO = { id: Id; name: string }

export type UserTypeDTO = { id: Id; name: string }

export type UserDetailsDTO = { id: Id; name: string }

export type FinalGeoDTO = {
  channelCode: string
  channelName: string
  subChannelCode: string
  subChannelName: string
  regionCode: string
  regionName: string
  areaCode: string
  areaName: string
  territoryCode: string
  territoryName: string
  agencyCode: number | string | null
  agencyName: string | null
  distributorName: string | null
  warehouseName: string | null
  sapAgCode: string | null
}

export type CreateChannelRequest = {
  userId: Id
  countryId: Id
  channelName: string
  channelCode: string
  isActive: boolean
}

export type UpdateChannelRequest = CreateChannelRequest & { id: Id }

export type CreateSubChannelRequest = {
  channelId: Id
  userId: Id
  subChannelName: string
  shortName: string
  subChannelCode: string
  isActive: boolean
}

export type UpdateSubChannelRequest = {
  id: Id
  channelId: Id
  userId: Id
  subChannelName: string
  shortName: string
  subChannelCode: string
  isActive: boolean
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

export type CreateTerritoryRequest = {
  userId: Id
  channelId?: Id
  subChannelId: Id
  rangeId: Id
  areaId: Id
  territoryName: string
  territoryCode: string
  displayOrder: number
  oldTerritoryId: Id
  isActive: boolean
}

export type UpdateTerritoryRequest = {
  id: Id
  userId: Id
  channelId?: Id
  subChannelId: Id
  rangeId: Id
  areaId: Id
  territoryName: string
  territoryCode: string
  displayOrder: number
  isActive: boolean
}

export type CreateAreaRequest = {
  userId: Id
  areaName: string
  areaCode: string
  displayOrder: number
  isActive: boolean
}

export type UpdateAreaRequest = CreateAreaRequest & { id: Id }

export type CreateAreaRegionMappingRequest = {
  areaRegionsDTOList: Array<{
    userId: Id
    areaId: Id
    regionId: Id
    isActive: boolean
  }>
}

export type UpdateAreaRegionRequest = {
  id: Id
  userId: Id
  areaId: Id
  regionId: Id
  displayOrder?: number
  isActive: boolean
}

export type CreateRouteRequest = {
  territoryId: Id
  userId: Id
  routeName: string
  routeCode: number
  displayOrder: number
  isActive: boolean
  oldRouteId?: Id
  oldRouteCode?: string
}

export type UpdateRouteRequest = CreateRouteRequest & { id: Id }

export type CreateDistributorRequest = {
  rangeId: Id
  userId?: Id | null
  distributorName: string
  email?: string | null
  address1?: string | null
  address2?: string | null
  address3?: string | null
  mobileNo: string
  telNo?: string | null
  vatNum?: string | null
  isActive: boolean
}

export type UpdateDistributorRequest = CreateDistributorRequest & { id: Id }
