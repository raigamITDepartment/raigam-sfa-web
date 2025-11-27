import { http } from '@/services/http'
import type {
  BookingInvoiceParams,
  BookingInvoicesResponse,
} from '@/types/invoice'

export const INVOICE_REPORT_BASE = '/api/v1/reports/invoiceReport'

export async function getAllAvailableBookingInvoices(
  params: BookingInvoiceParams
) {
  const res = await http.get<BookingInvoicesResponse>(
    `${INVOICE_REPORT_BASE}/getAllAvailableBookingInvoices`,
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
