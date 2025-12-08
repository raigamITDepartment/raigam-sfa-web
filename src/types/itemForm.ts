export type ItemFormValues = {
  mainCatId: number | null
  itemId: number | null
  itemName: string
  sellUnitPrice: number | null
  sellPriceId?: number | null
  adjustedUnitPrice: number | null
  totalBookQty: number | null
  totalCancelQty: number | null
  totalBookValue: number | null
  totalFreeQty: number | null
  bookDiscountPercentage: number | null
  totalBookDiscountValue: number | null
  totalBookSellValue: number | null
  goodReturnUnitPrice: number | null
  goodReturnPriceId?: number | null
  goodReturnAdjustedUnitPrice: number | null
  goodReturnTotalQty: number | null
  goodReturnFreeQty: number | null
  goodReturnTotalVal: number | null
  marketReturnUnitPrice: number | null
  marketReturnPriceId?: number | null
  marketReturnAdjustedUnitPrice: number | null
  marketReturnTotalQty: number | null
  marketReturnFreeQty: number | null
  marketReturnTotalVal: number | null
  finalTotalValue: number | null
}
