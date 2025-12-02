import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

const ITEM_REPORT_BASE = '/api/v1/reports/itemReport'

export type TerritoryWiseItemSummeryParams = {
  territoryId: number | string
  startDate: string
  endDate: string
}

export type TerritoryWiseItemSummeryItem = Record<string, unknown>

export type TerritoryWiseItemSummeryResponse =
  ApiResponse<TerritoryWiseItemSummeryItem[]>

export async function territoryWiseItemSummeryByRequiredArgs(
  params: TerritoryWiseItemSummeryParams
) {
  const res = await http.get<TerritoryWiseItemSummeryResponse>(
    `${ITEM_REPORT_BASE}/territoryWiseItemSummeryByRequiredArgs`,
    { params }
  )

  return res.data
}
