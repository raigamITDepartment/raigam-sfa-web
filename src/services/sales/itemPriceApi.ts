import { http } from '@/services/http'
import type { ApiResponse, Id } from '@/types/common'

export const ITEM_PRICE_BASE = '/api/v1/sales/itemPrice'

export type ItemPrice = {
  id: number
  userId: number | null
  subChannelId: number | null
  shortName: string | null
  rangeId: number | null
  itemId: number
  itemName: string
  sapCode: string
  itemPrice: number
  startDate: string
  validTill: string
  isActive: boolean
}

export type FindItemPriceResponse = ApiResponse<ItemPrice | null>

export async function findItemPriceById(priceId: Id): Promise<FindItemPriceResponse> {
  const res = await http.get<FindItemPriceResponse>(
    `${ITEM_PRICE_BASE}/findById/${priceId}`
  )
  return res.data
}
