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

export type ItemReportSummaryParams = {
  subChannelId: number | string
  areaId: number | string
  territoryId: number | string
  routeId: number | string
  outletId: number | string
  startDate: string
  endDate: string
}

export async function territoryWiseItemSummeryByRequiredArgs(
  params: TerritoryWiseItemSummeryParams
) {
  const res = await http.get<TerritoryWiseItemSummeryResponse>(
    `${ITEM_REPORT_BASE}/territoryWiseItemSummeryByRequiredArgs`,
    { params }
  )

  return res.data
}

export async function getItemSummery(params: ItemReportSummaryParams) {
  const res = await http.get<ApiResponse<unknown>>(
    `${ITEM_REPORT_BASE}/getItemSummeryByRequiredArgs`,
    { params }
  )
  return res.data
}

export async function getSubTwoCategorySummary(
  params: ItemReportSummaryParams
) {
  const res = await http.get<ApiResponse<unknown>>(
    `${ITEM_REPORT_BASE}/getSubTwoCategorySummeryByRequiredArgs`,
    { params }
  )
  return res.data
}

export async function getSubCategorySummery(
  params: ItemReportSummaryParams
) {
  const res = await http.get<ApiResponse<unknown>>(
    `${ITEM_REPORT_BASE}/getSubOneCategorySummeryByRequiredArgs`,
    { params }
  )
  return res.data
}

export async function getMainCategorySummery(
  params: ItemReportSummaryParams
) {
  const res = await http.get<ApiResponse<unknown>>(
    `${ITEM_REPORT_BASE}/getMainCategorySummeryByRequiredArgs`,
    { params }
  )
  return res.data
}
