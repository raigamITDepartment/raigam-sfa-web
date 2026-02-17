import type { Id } from './common'

export type OutletRecord = {
  id?: Id
  name?: string
  outletId?: Id
  outletCode?: string
  outletCategoryId?: Id
  uniqueCode?: string
  outletName?: string
  outletCategory?: string
  outletCategoryName?: string
  category?: string
  agencyCode?: number | string
  routeId?: Id
  routeCode?: number | string
  shopCode?: number | string
  channelName?: string
  areaName?: string
  territoryName?: string
  routeName?: string
  rangeId?: Id
  range?: string
  rangeName?: string
  owner?: string
  ownerName?: string
  mobile?: string
  mobileNo?: string
  address1?: string
  address2?: string
  address3?: string
  openTime?: string
  closeTime?: string
  latitude?: number | string
  longitude?: number | string
  vatNum?: string
  approved?: boolean | string
  isApproved?: boolean
  status?: boolean | string
  isClose?: boolean
  isNew?: boolean
  displayOrder?: number
  outletSequence?: number | string
  created?: string
  imagePath?: string | null
}
