import { http } from '@/services/http'

export type ApiResponse<T> = {
  code: number
  message: string
  payload: T
}

export const INVOICE_BASE = '/api/v1/sales/invoice'

export type BookingInvoice = {
  id: number
  userId: number | null
  territoryId: number
  agencyWarehouseId: number
  routeId: number
  rangeId: number
  outletId: number
  invoiceNo: string
  totalBookValue: number
  totalBookSellValue: number
  totalBookFinalValue: number
  totalCancelValue: number
  totalMarketReturnValue: number
  totalGoodReturnValue: number
  totalFreeValue: number
  totalActualValue: number
  totalDiscountValue: number
  discountPercentage: number
  dateBook: string
  dateActual: string
  dateSave: string
  invoiceType: string
  sourceApp: string
  longitude: number
  latitude: number
  isReversed: boolean
  isPrinted: boolean
  isBook: boolean
  isActual: boolean
  isLateDelivery: boolean
  invActualBy: number
  invReversedBy: number
  invUpdatedBy: number
  invCancelledBy: number | null
  isCancelReqAgent: boolean | null
  agentReqDate: string | null
  isCancelReqRep: boolean | null
  repReqDate: string | null
  isActive: boolean
  invoiceDetailDTOList: unknown[]
}

export type BookingInvoicesResponse = ApiResponse<BookingInvoice[]>

export async function getAllBookingInvoicesByTerritoryId(
  territoryId: number
): Promise<BookingInvoicesResponse> {
  const res = await http.get<BookingInvoicesResponse>(
    `${INVOICE_BASE}/getAllBookingInvoicesByTerritoryId/${territoryId}`
  )
  return res.data
}

export type CancelInvoiceResponse = ApiResponse<BookingInvoice | null>

export async function cancelInvoice(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.delete<CancelInvoiceResponse>(`${INVOICE_BASE}/cancelInvoice/${invoiceId}`, {
    params: { userId },
  })
  return res.data
}
