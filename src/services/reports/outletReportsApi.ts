import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'
import type { ReportInvoiceTypeParam } from '@/types/invoice'

export const OUTLET_REPORT_BASE = '/api/v1/reports/outletReport'

export type OutletSummeryReportParams = {
  subChannelId: number | string
  areaId: number | string
  territoryId: number | string
  routeId: number | string
  outletCategoryId: number | string
  invoiceType?: ReportInvoiceTypeParam
  startDate: string
  endDate: string
}

export type OutletSummeryReportItem = {
  channelId: number
  channelName: string
  subChannelId: number
  subChannelName: string
  regionId: number
  regionName: string
  areaId: number
  areaName: string
  territoryId: number
  territoryName: string
  routeId: number
  routeName: string
  outletCategoryId: number
  outletCategoryName: string
  outletId: number
  outletName: string
  totalActualValue: number
  totalActualInvoiceCount: number
  totalDiscountValue: number
  totalFreeValue: number
  totalMarketReturnValue: number
  totalGoodReturnValue: number
  totalCancelValue: number
  totalCancelInvoiceCount: number
}

export type OutletSummeryReportResponse =
  ApiResponse<OutletSummeryReportItem[]>

export async function getOutletSummeryReports(
  params: OutletSummeryReportParams
) {
  const res = await http.get<OutletSummeryReportResponse>(
    `${OUTLET_REPORT_BASE}/getOutletSummeryReportByRequiredArgs`,
    { params }
  )
  return res.data
}

export type NotVisitedOutletsParams = {
  subChannelId: number | string
  areaId: number | string
  territoryId: number | string
  routeId: number | string
  startDate: string
  endDate: string
}

export type NotVisitedOutletItem = Record<string, unknown>

export type NotVisitedOutletsResponse =
  ApiResponse<NotVisitedOutletItem[]>

export async function getNotVisitedOutlets(params: NotVisitedOutletsParams) {
  const res = await http.get<NotVisitedOutletsResponse>(
    `${OUTLET_REPORT_BASE}/findNotVisitedOutletsByRequiredArgs`,
    { params }
  )
  return res.data
}
