import { http } from '@/services/http'
import type { ApiResponse, Id } from '@/types/common'

export const ITEM_PRICE_BASE = '/api/v1/sales/itemPrice'
export const ITEM_MAIN_CATEGORY_BASE = '/api/v1/sales/itemMainCategory'
export const ITEM_GROUPED_BASE = '/api/v1/sales/item'

export type ItemPrice = {
  id: number
  userId: number | null
  subChannelId: number | null
  shortName: string | null
  rangeId: number | null
  itemId: number
  itemName: string | null
  sapCode: string | null
  itemPrice: number
  startDate: string
  validTill: string
  isActive: boolean
}

export type FindItemPriceResponse = ApiResponse<ItemPrice | null>
export type FindItemPriceByItemResponse = ApiResponse<ItemPrice[]>
export type ItemMainCategory = {
  userId: number | null
  catTypeId: number
  categoryType: string
  mainCatSeq: number
  itemMainCat: string
  isActive: boolean
  id: number
}
export type ItemMainCategoryResponse = ApiResponse<ItemMainCategory[]>

export type GroupedItemByMainCategory = {
  mainCatId: number
  mainCatName: string
  itemId: number
  itemName: string
  itemPriceList: unknown
  active: boolean
}
export type GroupedItemsByMainCategoryResponse = GroupedItemByMainCategory[]

export async function findItemPriceById(priceId: Id): Promise<FindItemPriceResponse> {
  const res = await http.get<FindItemPriceResponse>(
    `${ITEM_PRICE_BASE}/findById/${priceId}`
  )
  return res.data
}

export async function findItemPriceByItemId(itemId: Id): Promise<FindItemPriceByItemResponse> {
  const res = await http.get<FindItemPriceByItemResponse>(
    `${ITEM_PRICE_BASE}/findByItemId/${itemId}`
  )
  return res.data
}

export async function getItemMainCategories(): Promise<ItemMainCategoryResponse> {
  const res = await http.get<ItemMainCategoryResponse>(ITEM_MAIN_CATEGORY_BASE)
  return res.data
}

export async function getItemsGroupedByMainCategory(
  mainCatId: Id
): Promise<GroupedItemsByMainCategoryResponse> {
  const res = await http.get<GroupedItemsByMainCategoryResponse>(
    `${ITEM_GROUPED_BASE}/grouped-by-main-category-list/${mainCatId}`
  )
  return res.data
}
