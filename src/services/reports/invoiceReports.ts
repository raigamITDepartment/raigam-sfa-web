import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'
import type {
  ActiveInvoicesByTerritoryParams,
  BookingInvoiceParams,
  BookingInvoiceReportItem,
  BookingInvoicesResponse,
  BookingInvoicesByTerritoryResponse,
  InvoiceStatusParams,
} from '@/types/invoice'

export const INVOICE_REPORT_BASE = '/api/v1/reports/invoiceReport'
const INVOICE_PRINT_BASE = '/api/v1/sales/invoice'

export async function getAllAvailableBookingInvoices(
  params: BookingInvoiceParams
) {
  const res = await http.get<BookingInvoicesResponse>(
    `${INVOICE_REPORT_BASE}/getAllAvailableBookingInvoices`,
    { params }
  )
  return res.data
}

export async function getInvoiceDetailsByStatus(params: InvoiceStatusParams) {
  const res = await http.get<BookingInvoicesResponse>(
    `${INVOICE_REPORT_BASE}/getAllInvoicesByStatus`,
    { params }
  )
  return res.data
}

export async function getAllInvoicesbyTerritoryId(
  params: ActiveInvoicesByTerritoryParams
) {
  const res = await http.get<BookingInvoicesByTerritoryResponse>(
    `${INVOICE_REPORT_BASE}/getAllActiveInvoicesForMobile`,
    { params }
  )
  return res.data
}

export async function getInvoiceDetailsById(invoiceId: number | string) {
  const res = await http.get<ApiResponse<BookingInvoiceReportItem>>(
    `${INVOICE_REPORT_BASE}/findInvoiceWithDetailsByInvoiceId/${invoiceId}`
  )
  return res.data
}

export type InvoicePrintExtraDetailsParams = {
  territoryId: number
  routeId: number
  outletId: number
  invoiceId: number
  userId: number
}

export async function findInvoicePrintExtraDetailsByRequiredArgs(
  params: InvoicePrintExtraDetailsParams
) {
  const res = await http.get<ApiResponse<unknown>>(
    `${INVOICE_PRINT_BASE}/findInvoicePrintExtraDetailsByRequiredArgs`,
    { params }
  )
  return res.data
}

// Re-export types for backwards compatibility
export type {
  ActiveInvoicesByTerritoryParams,
  BookingInvoiceParams,
  BookingInvoiceReportItem,
  BookingInvoicesResponse,
  BookingInvoiceDetailDTO,
  InvoiceType,
  InvoiceStatusParams,
} from '@/types/invoice'
