import { formatPrice } from '@/lib/format-price'

export const safeNumber = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : 0

export const computeReturnTotal = (
  qty: number,
  freeQty: number,
  adjustedUnitPrice: number
) => {
  const payingQty = Math.max(qty - freeQty, 0)
  return Number((payingQty * adjustedUnitPrice).toFixed(2))
}

export const computeFinalTotal = (
  totalBookSellValue: number,
  goodReturnTotalVal: number,
  marketReturnTotalVal: number
) =>
  Number((totalBookSellValue - goodReturnTotalVal - marketReturnTotalVal).toFixed(2))

export const formatNegativeValue = (value?: number | null) => {
  const formatted = formatPrice(value)
  return formatted === '-' ? formatted : `-${formatted}`
}
