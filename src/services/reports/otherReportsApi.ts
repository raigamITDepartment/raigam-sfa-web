import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'
import type { ReportInvoiceTypeParam } from '@/types/invoice'

const ITEM_REPORT_BASE = '/api/v1/reports/itemReport'
const HR_ATTENDANCE_REPORT_BASE = '/api/v1/reports/hrAttendanceReport'
const HR_WORKING_DAY_BASE = '/api/v1/sales/hrWorkingDayType'
const HR_ATTENDANCE_COMMENTS_BASE = '/api/v1/sales/hrAttendanceComments'
const HR_WORKING_DAY_CALENDAR_BASE = '/api/v1/sales/hrWorkingDayCalendar'

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
  invoiceType?: ReportInvoiceTypeParam
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

export type SaveHrAttendanceCommentsPayload = {
  userId: number | string
  areaId: number | string
  salesRepId: number | string
  checkInDate: string
  eveningStatusId: number | string | null
  morningStatusId: number | string | null
  rsmComment: string
  aseComment: string
}

export type WorkingDayCalendarEntryPayload = {
  workingDate: string
  isWorkingDay?: boolean
  isHoliday?: boolean
  isActive?: boolean
}

export type AddWorkingDaysInMonthPayload = {
  userId: number | string
  workingYear: number
  workingMonth: number
  dayCalendarDTOList: WorkingDayCalendarEntryPayload[]
}

export type UpdateWorkingDayPayload = {
  id: number | string
  userId: number | string
  workingYear: number
  workingMonth: number
  workingDate: string
  isWorkingDay?: boolean
  isHoliday?: boolean
  isActive?: boolean
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

export async function saveHrAttendanceComments(
  payload: SaveHrAttendanceCommentsPayload
) {
  const res = await http.post<ApiResponse<unknown>>(
    HR_ATTENDANCE_COMMENTS_BASE,
    payload
  )
  return res.data
}

export async function findEntriesByYearAndMonth(
  year: number | string,
  month: number | string
) {
  const res = await http.get<ApiResponse<unknown>>(
    `${HR_WORKING_DAY_CALENDAR_BASE}/findEntriesByYearAndMonth/${year}/${month}`
  )
  return res.data
}

export async function addWorkingDyasInMonth(
  payload: AddWorkingDaysInMonthPayload
) {
  const res = await http.post<ApiResponse<unknown>>(
    HR_WORKING_DAY_CALENDAR_BASE,
    payload
  )
  return res.data
}

export async function updateWorkingDay(payload: UpdateWorkingDayPayload) {
  const res = await http.put<ApiResponse<unknown>>(
    HR_WORKING_DAY_CALENDAR_BASE,
    payload
  )
  return res.data
}
