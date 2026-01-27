import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

const ITEM_REPORT_BASE = '/api/v1/reports/itemReport'
const HR_ATTENDANCE_REPORT_BASE = '/api/v1/reports/hrAttendanceReport'
const HR_WORKING_DAY_BASE = '/api/v1/sales/hrWorkingDayType'

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

export type AttendanceReportParams = {
  areaId: number | string
  rangeId: number | string
  territoryId: number | string
  startDate: string
  endDate: string
}

export type AttendanceStatusItem = {
  userId?: number | string | null
  id: number | string
  workingDayType: string
  isActive?: boolean | null
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

export async function getAttendanceReport(params: AttendanceReportParams) {
  const res = await http.get<ApiResponse<unknown>>(
    `${HR_ATTENDANCE_REPORT_BASE}/getAttendanceReportByRequiredArgs`,
    { params }
  )
  return res.data
}

export async function getAttendanceStatusList() {
  const res = await http.get<ApiResponse<AttendanceStatusItem[]>>(
    HR_WORKING_DAY_BASE
  )
  return res.data
}
