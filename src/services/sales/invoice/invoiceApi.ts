import { http } from '@/services/http'
import type {
  BookingInvoicesByTerritoryResponse,
  CancelInvoiceResponse,
  CreateInvoicePayload,
  CreateInvoiceResponse,
  UpdateBookingInvoiceResponse,
  UpdateBookingInvoiceWithDetailsPayload,
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

/* export async function cancelInvoice(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.delete<CancelInvoiceResponse>(
    `${INVOICE_BASE}/cancelInvoice/${invoiceId}`,
    {
      params: { userId },
    }
  )
  return res.data
} */

export async function cancelInvoiceWithRemark(
  invoiceId: number | string,
  userId: number | string,
  cancelRemark: string
) {
  const res = await http.delete<CancelInvoiceResponse>(
    `${INVOICE_BASE}/cancelInvoice/${invoiceId}`,
    {
      params: { userId, cancelRemark },
    }
  )
  return res.data
}

export async function updateBookingInvoiceWithDetails(
  payload: UpdateBookingInvoiceWithDetailsPayload
) {
  const toNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0
  const details = Array.isArray(payload.invoiceDetailDTOList)
    ? payload.invoiceDetailDTOList
    : []
  const detailsTotal = details.reduce(
    (sum, item) => sum + toNumber(item.finalTotalValue),
    0
  )
  const discountValue = (() => {
    const explicit = toNumber(payload.totalDiscountValue)
    if (explicit) return explicit
    const pct = toNumber(payload.discountPercentage)
    return pct ? (detailsTotal * pct) / 100 : 0
  })()
  const grandTotal =
    details.length > 0
      ? Number((detailsTotal - discountValue).toFixed(2))
      : payload.totalBookFinalValue
  const normalizedPayload = {
    ...payload,
    totalBookFinalValue: grandTotal,
  }
  const res = await http.put<UpdateBookingInvoiceResponse>(
    INVOICE_BASE,
    normalizedPayload
  )
  return res.data
}

export async function createInvoice(payload: CreateInvoicePayload) {
  const res = await http.post<CreateInvoiceResponse>(INVOICE_BASE, payload)
  return res.data
}

export async function updateBookingInvoiceToLateDelivery(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.put<UpdateBookingInvoiceResponse>(
    `${INVOICE_BASE}/updateInvoiceHeaderForBookingToLateDeliveryScenario`,
    null,
    {
      params: { invoiceId, userId },
    }
  )
  return res.data
}

export async function updateBookingInvoiceToActual(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.put<UpdateBookingInvoiceResponse>(
    `${INVOICE_BASE}/updateBookingInvoiceWithDetailsToActualScenario`,
    null,
    {
      params: { invoiceId, userId },
    }
  )
  return res.data
}

export async function updateLateDeliveryToActualInvoice(
  invoiceId: number | string,
  userId: number | string
) {
  const res = await http.put<UpdateBookingInvoiceResponse>(
    `${INVOICE_BASE}/updateLateDeliveryInvoiceWithDetailsToActualScenario`,
    null,
    {
      params: { invoiceId, userId },
    }
  )
  return res.data
}

type ReverseApprovalParams = {
  invoiceId: number | string
  repId?: number | string
  agentId?: number | string
  userId?: number | string
  isRepRequest?: boolean
  isAgentRequest?: boolean
}

export async function reverseApprovalOfActualInvoice({
  invoiceId,
  repId,
  agentId,
  userId,
  isRepRequest = true,
  isAgentRequest = true,
}: ReverseApprovalParams) {
  const params: Record<string, number | string | boolean | undefined> = {
    invoiceId,
    isRepRequest,
    isAgentRequest,
    repId,
    agentId,
    userId,
  }
  if (!repId && !agentId && userId != null) {
    params.userId = userId
  }
  const res = await http.put<UpdateBookingInvoiceResponse>(
    `${INVOICE_BASE}/reverseApprovalOfActualInvoice`,
    null,
    { params }
  )
  return res.data
}

export async function approveInvoiceReverseASM(
  invoiceId: number | string,
  userId: number | string,
  reverseRemark: string
) {
  const res = await http.put<UpdateBookingInvoiceResponse>(
    `${INVOICE_BASE}/reverseActualInvoice/${invoiceId}`,
    null,
    {
      params: { userId, reverseRemark },
    }
  )
  return res.data
}
