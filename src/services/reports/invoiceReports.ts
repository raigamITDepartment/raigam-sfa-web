import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'
import type {
  BookingInvoiceParams,
  BookingInvoicesResponse,
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
  BookingInvoiceParams,
  BookingInvoiceReportItem,
  BookingInvoicesResponse,
  BookingInvoiceDetailDTO,
  InvoiceType,
} from '@/types/invoice'
