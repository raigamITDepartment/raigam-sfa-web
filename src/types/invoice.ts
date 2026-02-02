import type { ApiResponse } from './common'

export type InvoiceType = 'ALL' | 'NORMAL' | 'AGENCY' | 'COMPANY'

// API accepts empty string when filtering for all invoice types.
export type InvoiceTypeParam = InvoiceType | ''

export type ReportInvoiceType = Exclude<InvoiceType, 'ALL'>
export type ReportInvoiceTypeParam = ReportInvoiceType | '' | null

export type BookingInvoiceParams = {
  territoryId: number
  startDate: string
  endDate: string
  invoiceType: InvoiceTypeParam
}

export type ActiveInvoicesByTerritoryParams = {
  territoryId?: number
  userId?: number
  startDate: string
  endDate: string
}

export type InvoiceStatusParams = BookingInvoiceParams & {
  invoiceStatus: string
}

export type BookingInvoiceFilters = {
  startDate?: string
  endDate?: string
  invoiceType: InvoiceType
  territoryId?: number
}

export type BookingInvoiceDetailDTO = {
  id: number
  invoiceId: number
  itemId: number
  itemName: string
  sellPriceId: number | null
  sellUnitPrice: number
  adjustedUnitPrice?: number
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
  goodReturnAdjustedUnitPrice?: number
  goodReturnFreeQty: number
  goodReturnTotalQty: number
  goodReturnTotalVal: number
  marketReturnPriceId: number | null
  marketReturnUnitPrice: number
  marketReturnAdjustedUnitPrice?: number
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
  totalBookSellValue: number | null
  totalBookFinalValue: number | null
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
  isReverseReqRep?: boolean | null
  invActualBy: number
  invReversedBy: number
  invUpdatedBy: number
  invCancelledBy: number | null
  isActive: boolean
  invoiceDetailDTOList: BookingInvoiceDetailDTO[]
}

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
  invoiceType: InvoiceType | string
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

export type BookingInvoicesResponse = ApiResponse<BookingInvoiceReportItem[]>
export type BookingInvoicesByTerritoryResponse = ApiResponse<BookingInvoice[]>
export type CancelInvoiceResponse = ApiResponse<BookingInvoice | null>
export type UpdateBookingInvoiceResponse = ApiResponse<BookingInvoice>
export type CreateInvoiceResponse = ApiResponse<BookingInvoice>
export type UpdateBookingInvoiceWithDetailsPayload = {
  id: number
  userId: number
  territoryId: number
  agencyWarehouseId: number
  routeId: number
  rangeId: number
  outletId: number
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
  invoiceType: InvoiceType | string
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
  isActive: boolean
  invoiceDetailDTOList: Array<{
    id?: number
    itemId: number
    sellPriceId: number | null
    sellUnitPrice: number
    adjustedUnitPrice?: number
    totalBookQty: number
    bookDiscountPercentage: number
    totalBookDiscountValue: number
    totalBookValue: number
    totalBookSellValue: number
    totalBookFinalValue: number
    totalCancelQty: number
    totalFreeQty: number
    totalActualQty: number
    totalDiscountValue: number
    discountPercentage: number
    sellTotalPrice: number
    goodReturnPriceId: number | null
    goodReturnUnitPrice: number
  goodReturnAdjustedUnitPrice?: number
    goodReturnFreeQty: number
    goodReturnTotalQty: number
    goodReturnTotalVal: number
    marketReturnPriceId: number | null
    marketReturnUnitPrice: number
    marketReturnAdjustedUnitPrice?: number
    marketReturnFreeQty: number
    marketReturnTotalQty: number
    marketReturnTotalVal: number
    finalTotalValue: number
    isActive: boolean
  }>
}

export type CreateInvoicePayload = {
  userId: number
  territoryId: number
  agencyWarehouseId: number
  routeId: number
  rangeId: number
  outletId: number
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
  invoiceType: InvoiceType | string
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
  isActive: boolean
  appInvoiceNumber?: number
  invoiceDetailDTOList: Array<{
    itemId: number
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
  }>
}
