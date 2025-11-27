import { http } from '@/services/http'
import type {
  BookingInvoicesByTerritoryResponse,
  CancelInvoiceResponse,
} from '@/types/invoice'

export const INVOICE_BASE = '/api/v1/sales/invoice'

export async function getAllBookingInvoicesByTerritoryId(
  territoryId: number
): Promise<BookingInvoicesByTerritoryResponse> {
  const res = await http.get<BookingInvoicesByTerritoryResponse>(
    `${INVOICE_BASE}/getAllBookingInvoicesByTerritoryId/${territoryId}`
  )
  return res.data
}

export async function cancelInvoice(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.delete<CancelInvoiceResponse>(`${INVOICE_BASE}/cancelInvoice/${invoiceId}`, {
    params: { userId },
  })
  return res.data
}
