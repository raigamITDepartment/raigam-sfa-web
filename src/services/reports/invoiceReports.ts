import { http } from '@/services/http'

export const INVOICE_REPORT_BASE = '/api/v1/reports/invoiceReport'

export type InvoiceType = 'ALL' | 'NORMAL' | 'AGENCY' | 'COMPANY'

export type BookingInvoiceParams = {
  territoryId: number
  startDate: string
  endDate: string
  invoiceType: InvoiceType | ''
}

export type ApiResponse<T> = {
  code: number
  message: string
  payload: T
}

export type BookingInvoiceDetailDTO = {
  id: number
  invoiceId: number
  itemId: number
  itemName: string
  sellPriceId: number | null
  sellUnitPrice: number
  totalBookQty: number
  bookDiscountPercentage: number
  totalBookDiscountValue: number
  totalBookValue: number
  totalBookSellValue: number
  totalCancelQty: number
  totalFreeQty: number
  totalActualQty: number
  totalDiscountValue: number
  discountPercentage: number
  sellTotalPrice: number
  goodReturnPriceId: number | null
  goodReturnUnitPrice: number
  goodReturnFreeQty: number
  goodReturnTotalQty: number
  goodReturnTotalVal: number
  marketReturnPriceId: number | null
  marketReturnUnitPrice: number
  marketReturnFreeQty: number
  marketReturnTotalQty: number
  marketReturnTotalVal: number
  finalTotalValue: number
  isActive: boolean
}

export type BookingInvoiceReportItem = {
  id: number
  userId: number | null
  territoryId: number
  agencyWarehouseId: number
  routeId: number
  routeName: string
  rangeId: number
  outletId: number
  outletName: string
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
  invoiceType: InvoiceType
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
  isActive: boolean
  invoiceDetailDTOList: BookingInvoiceDetailDTO[]
}

export type BookingInvoicesResponse = ApiResponse<BookingInvoiceReportItem[]>

export async function getAllAvailableBookingInvoices(
  params: BookingInvoiceParams
) {
  const res = await http.get<BookingInvoicesResponse>(
    `${INVOICE_REPORT_BASE}/getAllAvailableBookingInvoices`,
    { params }
  )
  return res.data
}
