import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  BookingInvoice,
  BookingInvoiceDetailDTO,
  BookingInvoiceReportItem,
} from '@/types/invoice'
import {
  computeFinalTotal,
  computeReturnTotal,
  safeNumber,
} from '@/lib/invoice-calcs'
import { findItemPriceById } from '@/services/sales/itemPriceApi'
import { toast } from 'sonner'
import { updateBookingInvoiceWithDetails } from '@/services/sales/invoice/invoiceApi'
import ItemForm from './ItemForm'
import type { ItemFormValues } from '@/types/itemForm'
import InvoiceItemsTableLayout, { type AggregatedTotals, type InvoiceItemRow } from './InvoiceItemsTableLayout'

type BookingInvoiceItemsTableProps = {
  invoice: BookingInvoiceReportItem
  items: BookingInvoiceDetailDTO[]
  onUpdated?: (payload?: BookingInvoice | null) => void
  userId?: number | null
  onCancel?: () => void
}

const recalcDerivedValues = (item: BookingInvoiceDetailDTO) => {
  const bookQty = safeNumber(item.totalBookQty)
  const cancelQty = safeNumber(item.totalCancelQty)
  const netBookQty = Math.max(bookQty - cancelQty, 0)
  const unitPrice = safeNumber(item.sellUnitPrice)
  const discountPct =
    item.bookDiscountPercentage ?? item.discountPercentage ?? 0

  const grossTotal = safeNumber(item.totalBookValue ?? netBookQty * unitPrice)
  const discountValue = safeNumber(
    item.totalBookDiscountValue ?? item.totalDiscountValue ?? (grossTotal * discountPct) / 100
  )
  const discountAfterValue = safeNumber(
    item.totalBookSellValue ?? item.sellTotalPrice ?? grossTotal - discountValue
  )

  const goodReturnQty = safeNumber(item.goodReturnTotalQty)
  const goodReturnFreeQty = safeNumber(item.goodReturnFreeQty)
  const goodReturnUnitPrice = safeNumber(item.goodReturnUnitPrice)
  const goodReturnAdjustedUnitPrice = safeNumber(
    item.goodReturnAdjustedUnitPrice ?? goodReturnUnitPrice
  )
  const goodReturnTotalVal = computeReturnTotal(
    goodReturnQty,
    goodReturnFreeQty,
    goodReturnAdjustedUnitPrice
  )

  const marketReturnQty = safeNumber(item.marketReturnTotalQty)
  const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
  const marketReturnUnitPrice = safeNumber(item.marketReturnUnitPrice)
  const marketReturnAdjustedUnitPrice = safeNumber(
    item.marketReturnAdjustedUnitPrice ?? marketReturnUnitPrice
  )
  const marketReturnTotalVal = computeReturnTotal(
    marketReturnQty,
    marketReturnFreeQty,
    marketReturnAdjustedUnitPrice
  )

  const finalTotalValue = computeFinalTotal(
    discountAfterValue,
    goodReturnTotalVal,
    marketReturnTotalVal
  )
  return {
    ...item,
    totalBookValue: grossTotal,
    totalBookDiscountValue: discountValue,
    totalBookSellValue: discountAfterValue,
    sellTotalPrice: discountAfterValue,
    totalDiscountValue: discountValue,
    goodReturnTotalVal,
    marketReturnTotalVal,
    finalTotalValue,
    // persist adjusted prices if backend provided
      goodReturnAdjustedUnitPrice,
      marketReturnAdjustedUnitPrice,
  }
}

export function BookingInvoiceItemsTable({
  invoice,
  items,
  onUpdated: _onUpdated,
  userId: _userId,
  onCancel: _onCancel,
}: BookingInvoiceItemsTableProps) {
  const emptyDraft: ItemFormValues = {
    mainCatId: null,
    itemId: null,
    itemName: '',
    sellUnitPrice: null,
    sellPriceId: null,
    adjustedUnitPrice: null,
    totalBookQty: 0,
    totalCancelQty: 0,
    totalBookValue: null,
    totalFreeQty: 0,
    bookDiscountPercentage: 0,
    totalBookDiscountValue: null,
    totalBookSellValue: null,
    goodReturnUnitPrice: null,
    goodReturnPriceId: null,
    goodReturnAdjustedUnitPrice: null,
    goodReturnTotalQty: null,
    goodReturnFreeQty: null,
    goodReturnTotalVal: null,
    marketReturnUnitPrice: null,
    marketReturnPriceId: null,
    marketReturnAdjustedUnitPrice: null,
    marketReturnTotalQty: null,
    marketReturnFreeQty: null,
    marketReturnTotalVal: null,
    finalTotalValue: null,
  }
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [draftItem, setDraftItem] = useState<ItemFormValues>(emptyDraft)
  const [localItems, setLocalItems] =
    useState<BookingInvoiceDetailDTO[]>(items)
  const [isUpdating, setIsUpdating] = useState(false)
  const [summaryDiscountPct, setSummaryDiscountPct] = useState<number>(invoice.discountPercentage ?? 0)
  useEffect(() => {
    setLocalItems(items)
  }, [items])
  useEffect(() => {
    setSummaryDiscountPct(invoice.discountPercentage ?? 0)
  }, [invoice.discountPercentage])
  const [priceMap, setPriceMap] = useState<Record<number, number>>({})
  const derivedItems = useMemo(
    () => localItems.map((item) => recalcDerivedValues(item)),
    [localItems]
  )
  const priceIds = useMemo(() => {
    const ids = new Set<number>()
    localItems.forEach((item) => {
      if (typeof item.sellPriceId === 'number') ids.add(item.sellPriceId)
      if (typeof item.goodReturnPriceId === 'number') ids.add(item.goodReturnPriceId)
      if (typeof item.marketReturnPriceId === 'number') ids.add(item.marketReturnPriceId)
    })
    return Array.from(ids)
  }, [localItems])

  useEffect(() => {
    if (!priceIds.length) return
    let cancelled = false
    const load = async () => {
      try {
        const entries = await Promise.all(
          priceIds.map(async (id) => {
            try {
              const res = await findItemPriceById(id)
              const price = res.payload?.itemPrice
              return typeof price === 'number' ? ([id, price] as const) : null
            } catch {
              return null
            }
          })
        )
        if (cancelled) return
        const next: Record<number, number> = {}
        entries.forEach((entry) => {
          if (entry) {
            const [id, price] = entry
            next[id] = price
          }
        })
        setPriceMap(next)
      } catch {
        // silent fail; we fall back to existing values
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [priceIds])

  const handleAddItem = (next: ItemFormValues) => {
    if (!next.itemId) {
      setAddItemOpen(false)
      return
    }
    const hasReturns =
      safeNumber(next.goodReturnTotalQty) > 0 ||
      safeNumber(next.marketReturnTotalQty) > 0
    const hasBaseItemInfo =
      !!next.itemId &&
      !!next.sellUnitPrice &&
      next.totalBookQty !== null &&
      next.totalBookQty !== undefined
    if (hasReturns && !hasBaseItemInfo) {
      toast.warning(
        'You want to add only good returns or market returns without add any items, plz set Item name, Select Item price and set quintity value 0'
      )
      return
    }
    const bookQty = safeNumber(next.totalBookQty)
    const cancelQty = safeNumber(next.totalCancelQty)
    const netQty = Math.max(bookQty - cancelQty, 0)
    const unitPrice = safeNumber(
      next.adjustedUnitPrice ?? next.sellUnitPrice
    )
    const totalBookValue = Number((netQty * unitPrice).toFixed(2))
    const discountPct = safeNumber(next.bookDiscountPercentage)
    const totalBookDiscountValue = Number(
      ((totalBookValue * discountPct) / 100).toFixed(2)
    )
    const totalBookSellValue = Number(
      (totalBookValue - totalBookDiscountValue).toFixed(2)
    )
    const goodReturnAdjustedUnitPrice = safeNumber(
      next.goodReturnAdjustedUnitPrice ?? next.goodReturnUnitPrice
    )
    const marketReturnAdjustedUnitPrice = safeNumber(
      next.marketReturnAdjustedUnitPrice ?? next.marketReturnUnitPrice
    )
    const goodReturnTotalVal = computeReturnTotal(
      safeNumber(next.goodReturnTotalQty),
      safeNumber(next.goodReturnFreeQty),
      goodReturnAdjustedUnitPrice
    )
    const marketReturnTotalVal = computeReturnTotal(
      safeNumber(next.marketReturnTotalQty),
      safeNumber(next.marketReturnFreeQty),
      marketReturnAdjustedUnitPrice
    )
    const finalTotalValue = computeFinalTotal(
      totalBookSellValue,
      goodReturnTotalVal,
      marketReturnTotalVal
    )

    const newItem: BookingInvoiceDetailDTO = {
      id: Date.now(),
      invoiceId: invoice.id,
      itemId: next.itemId ?? 0,
      itemName: next.itemName ?? '',
      sellPriceId: next.sellPriceId ?? null,
      sellUnitPrice: unitPrice,
      totalBookQty: bookQty,
      bookDiscountPercentage: discountPct,
      totalBookDiscountValue,
      totalBookValue,
      totalBookSellValue,
      totalCancelQty: cancelQty,
      totalFreeQty: safeNumber(next.totalFreeQty),
      totalActualQty: 0,
      totalDiscountValue: totalBookDiscountValue,
      discountPercentage: discountPct,
      sellTotalPrice: totalBookSellValue,
      goodReturnUnitPrice: safeNumber(next.goodReturnUnitPrice),
      // persist adjusted price for accurate return totals
      ...(Number.isFinite(goodReturnAdjustedUnitPrice) && {
        goodReturnAdjustedUnitPrice: goodReturnAdjustedUnitPrice as any,
      }),
      goodReturnPriceId: next.goodReturnPriceId ?? null,
      goodReturnFreeQty: safeNumber(next.goodReturnFreeQty),
      goodReturnTotalQty: safeNumber(next.goodReturnTotalQty),
      goodReturnTotalVal,
      marketReturnPriceId: next.marketReturnPriceId ?? null,
      marketReturnUnitPrice: safeNumber(next.marketReturnUnitPrice),
      ...(Number.isFinite(marketReturnAdjustedUnitPrice) && {
        marketReturnAdjustedUnitPrice: marketReturnAdjustedUnitPrice as any,
      }),
      marketReturnFreeQty: safeNumber(next.marketReturnFreeQty),
      marketReturnTotalQty: safeNumber(next.marketReturnTotalQty),
      marketReturnTotalVal,
      finalTotalValue,
      isActive: true,
    }
    setLocalItems((prev) => [...prev, newItem])
    setAddItemOpen(false)
    setDraftItem(emptyDraft)
  }

  const handleUpdate = async () => {
    try {
      setIsUpdating(true)
      const storedUserId =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem('userId'))
          : NaN
      const effectiveUserId = Number.isFinite(storedUserId)
        ? storedUserId
        : (_userId ?? invoice.userId ?? 0)
      const details = localItems.map((item) => {
        const sellUnitPrice = safeNumber(item.sellUnitPrice)
        const discountPct = safeNumber(item.bookDiscountPercentage ?? item.discountPercentage)
        const totalBookValue = safeNumber(item.totalBookValue)
        const totalBookDiscountValue = safeNumber(item.totalBookDiscountValue ?? item.totalDiscountValue)
        const totalBookSellValue = safeNumber(item.totalBookSellValue ?? item.sellTotalPrice)
        const goodReturnAdjustedUnitPrice = safeNumber(
          item.goodReturnAdjustedUnitPrice ?? item.goodReturnUnitPrice
        )
        const marketReturnAdjustedUnitPrice = safeNumber(
          item.marketReturnAdjustedUnitPrice ?? item.marketReturnUnitPrice
        )
        const goodReturnQty = safeNumber(item.goodReturnTotalQty)
        const goodReturnFreeQty = safeNumber(item.goodReturnFreeQty)
        const marketReturnQty = safeNumber(item.marketReturnTotalQty)
        const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
        const goodReturnTotalVal = computeReturnTotal(
          goodReturnQty,
          goodReturnFreeQty,
          goodReturnAdjustedUnitPrice
        )
        const marketReturnTotalVal = computeReturnTotal(
          marketReturnQty,
          marketReturnFreeQty,
          marketReturnAdjustedUnitPrice
        )
        const finalTotalValue = computeFinalTotal(
          totalBookSellValue,
          goodReturnTotalVal,
          marketReturnTotalVal
        )
        return {
          id: item.id,
          itemId: item.itemId,
          sellPriceId: item.sellPriceId ?? null,
          sellUnitPrice,
          totalBookQty: safeNumber(item.totalBookQty),
          bookDiscountPercentage: discountPct,
          totalBookDiscountValue,
          totalBookValue,
          totalBookSellValue,
          totalBookFinalValue: totalBookSellValue,
          totalCancelQty: safeNumber(item.totalCancelQty),
          totalFreeQty: safeNumber(item.totalFreeQty),
          totalActualQty: safeNumber(item.totalActualQty),
          totalDiscountValue: totalBookDiscountValue,
          discountPercentage: discountPct,
          sellTotalPrice: totalBookSellValue,
          goodReturnPriceId: item.goodReturnPriceId ?? null,
          goodReturnUnitPrice: safeNumber(item.goodReturnUnitPrice),
          goodReturnAdjustedUnitPrice,
          goodReturnFreeQty: safeNumber(item.goodReturnFreeQty),
          goodReturnTotalQty: goodReturnQty,
          goodReturnTotalVal,
          marketReturnPriceId: item.marketReturnPriceId ?? null,
          marketReturnUnitPrice: safeNumber(item.marketReturnUnitPrice),
          marketReturnAdjustedUnitPrice,
          marketReturnFreeQty: safeNumber(item.marketReturnFreeQty),
          marketReturnTotalQty: marketReturnQty,
          marketReturnTotalVal,
          finalTotalValue,
          isActive: item.isActive ?? true,
        }
      })

      const invoiceDiscountValue = totals.totalDiscountValue
      const invoiceBookFinalValue = totals.totalActualValue
      const invoiceActualValue =
        typeof invoice.totalActualValue === 'number'
          ? invoice.totalActualValue
          : totals.totalActualValue

      const payload = {
        id: invoice.id,
        userId: effectiveUserId as number,
        territoryId: invoice.territoryId,
        agencyWarehouseId: invoice.agencyWarehouseId,
        routeId: invoice.routeId,
        rangeId: invoice.rangeId,
        outletId: invoice.outletId,
        totalBookValue: aggregatedTotals.totalBookValue,
        totalBookSellValue: aggregatedTotals.totalBookSellValue,
        totalBookFinalValue: invoiceBookFinalValue,
        totalCancelValue: aggregatedTotals.totalCancelValue,
        totalMarketReturnValue: aggregatedTotals.totalMarketReturnValue,
        totalGoodReturnValue: aggregatedTotals.totalGoodReturnValue,
        totalFreeValue: aggregatedTotals.totalFreeValue,
        totalActualValue: invoiceActualValue,
        totalDiscountValue: invoiceDiscountValue,
        discountPercentage: summaryDiscountPct ?? 0,
        invoiceType: invoice.invoiceType ?? 'NORMAL',
        sourceApp: invoice.sourceApp ?? 'WEB',
        longitude: invoice.longitude ?? 0,
        latitude: invoice.latitude ?? 0,
        isReversed: invoice.isReversed ?? false,
        isPrinted: invoice.isPrinted ?? false,
        isBook: invoice.isBook ?? true,
        isActual: invoice.isActual ?? false,
        isLateDelivery: invoice.isLateDelivery ?? false,
        invActualBy: (invoice.invActualBy as number) ?? 0,
        invReversedBy: (invoice.invReversedBy as number) ?? 0,
        invUpdatedBy: (invoice.invUpdatedBy as number) ?? 0,
        isActive: invoice.isActive ?? true,
        invoiceDetailDTOList: details,
      }

      const res = await updateBookingInvoiceWithDetails(payload as any)
      if (res?.message) {
        toast.success(res.message)
      } else {
        toast.success('Invoice updated successfully')
      }
      _onUpdated?.((res as any)?.payload ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update invoice'
      toast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }

  const tableRows = useMemo<InvoiceItemRow[]>(() => {
    return derivedItems.map((item) => {
      const bookQty = safeNumber(item.totalBookQty)
      const cancelQty = safeNumber(item.totalCancelQty)
      const netBookQty = Math.max(bookQty - cancelQty, 0)
      const rawSellUnitPrice = safeNumber(item.sellUnitPrice)
      const unitPrice =
        (item.sellPriceId && priceMap[item.sellPriceId]) ??
        rawSellUnitPrice
      const discountPct =
        item.bookDiscountPercentage ?? item.discountPercentage ?? 0
      const grossValue = safeNumber(
        item.totalBookValue ?? netBookQty * unitPrice
      )
      const discountValue = safeNumber(
        item.totalDiscountValue ?? item.totalBookDiscountValue
      )
      const discountAfterValue = safeNumber(
        item.totalBookSellValue ?? grossValue - discountValue
      )
      const adjustedUnitPrice = safeNumber(
        item.adjustedUnitPrice ?? rawSellUnitPrice
      )
      const freeIssueQty = safeNumber(item.totalFreeQty)

      const goodReturnQty = safeNumber(item.goodReturnTotalQty)
      const goodReturnFreeQty = safeNumber(item.goodReturnFreeQty)
      const goodReturnUnitPrice = safeNumber(item.goodReturnUnitPrice)
      const goodReturnAdjustedUnitPrice = safeNumber(
        item.goodReturnAdjustedUnitPrice ?? goodReturnUnitPrice
      )
    const goodReturnPayingQty = Math.max(
      goodReturnQty - goodReturnFreeQty,
      0
    )
    const goodReturnTotalVal = computeReturnTotal(
      goodReturnQty,
      goodReturnFreeQty,
      goodReturnAdjustedUnitPrice
    )

      const marketReturnQty = safeNumber(item.marketReturnTotalQty)
      const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
      const marketReturnUnitPrice = safeNumber(item.marketReturnUnitPrice)
      const marketReturnAdjustedUnitPrice = safeNumber(
        item.marketReturnAdjustedUnitPrice ?? marketReturnUnitPrice
      )
    const marketReturnPayingQty = Math.max(
      marketReturnQty - marketReturnFreeQty,
      0
    )
    const marketReturnTotalVal = computeReturnTotal(
      marketReturnQty,
      marketReturnFreeQty,
      marketReturnAdjustedUnitPrice
    )

      return {
        ...item,
        netBookQty,
        unitPrice,
        discountPct,
        discountValue,
        grossValue,
        discountAfterValue,
        adjustedUnitPrice,
        freeIssueQty,
        goodReturnPayingQty,
        goodReturnAdjustedUnitPrice,
        marketReturnPayingQty,
        marketReturnAdjustedUnitPrice,
        goodReturnUnitPrice,
        marketReturnUnitPrice,
        goodReturnTotalVal,
        marketReturnTotalVal,
      }
    })
  }, [derivedItems, priceMap])

  const aggregatedTotals = useMemo<AggregatedTotals>(() => {
    return tableRows.reduce<AggregatedTotals>(
      (acc, item) => {
        const unitPrice = safeNumber(item.unitPrice)
        const bookQty = safeNumber(item.totalBookQty)
        const cancelQty = safeNumber(item.totalCancelQty)
        const netBookQty = Math.max(bookQty - cancelQty, 0)
        const gross = safeNumber(item.grossValue ?? netBookQty * unitPrice)
      const discountValue = safeNumber(item.discountValue)
        const discountAfterValue = safeNumber(
          item.discountAfterValue ?? gross - discountValue
        )
        const bookFinalValue = discountAfterValue
        const adjustedUnitPrice = safeNumber(
          item.adjustedUnitPrice ?? unitPrice
        )
        const goodReturnAdjustedUnitPrice = safeNumber(
          item.goodReturnAdjustedUnitPrice ?? item.goodReturnUnitPrice
        )
        const marketReturnAdjustedUnitPrice = safeNumber(
          item.marketReturnAdjustedUnitPrice ?? item.marketReturnUnitPrice
        )
        const goodReturnVal = computeReturnTotal(
          safeNumber(item.goodReturnTotalQty),
          safeNumber(item.goodReturnFreeQty),
          goodReturnAdjustedUnitPrice
        )
        const marketReturnVal = computeReturnTotal(
          safeNumber(item.marketReturnTotalQty),
          safeNumber(item.marketReturnFreeQty),
          marketReturnAdjustedUnitPrice
        )
        const finalValue = computeFinalTotal(
          discountAfterValue,
          goodReturnVal,
          marketReturnVal
        )
        acc.totalBookValue += gross
        acc.totalBookSellValue += discountAfterValue
        acc.totalBookFinalValue += bookFinalValue
        acc.totalCancelQty += cancelQty
        acc.totalCancelValue += cancelQty * adjustedUnitPrice
        acc.totalMarketReturnValue += marketReturnVal
        acc.totalGoodReturnValue += goodReturnVal
        const freeQty = safeNumber(item.totalFreeQty)
        acc.totalFreeQty += freeQty
        acc.totalFreeValue += freeQty * adjustedUnitPrice
        acc.totalActualGrossValue += gross
        acc.totalActualValue += finalValue
        acc.totalDiscountValue += discountValue
        acc.totalFinalValue += finalValue
        return acc
      },
      {
        totalBookValue: 0,
        totalBookSellValue: 0,
        totalBookFinalValue: 0,
        totalCancelQty: 0,
        totalCancelValue: 0,
        totalMarketReturnValue: 0,
        totalGoodReturnValue: 0,
        totalFreeQty: 0,
        totalFreeValue: 0,
        totalActualValue: 0,
        totalActualGrossValue: 0,
        totalDiscountValue: 0,
        totalFinalValue: 0,
      }
    )
  }, [tableRows])

  const totals = useMemo<AggregatedTotals>(() => {
    const discountValue =
      (aggregatedTotals.totalFinalValue * summaryDiscountPct) / 100
    const actualValue = aggregatedTotals.totalFinalValue - discountValue
    return {
      ...aggregatedTotals,
      totalDiscountValue: discountValue,
      totalActualValue: actualValue,
    }
  }, [aggregatedTotals, summaryDiscountPct])

  return (
    <div className='space-y-2'>
      <InvoiceItemsTableLayout
        tableRows={tableRows}
        aggregatedTotals={aggregatedTotals}
        totals={totals}
        summaryDiscountPct={summaryDiscountPct}
        onSummaryDiscountChange={(val) => setSummaryDiscountPct(val)}
        onAddItem={() => setAddItemOpen(true)}
        onUpdate={handleUpdate}
        onCancel={_onCancel}
        isUpdating={isUpdating}
      />
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className='max-w-4xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription className='sr-only'>
              Add or edit invoice item details
            </DialogDescription>
          </DialogHeader>
          <ItemForm
            value={draftItem}
            onChange={setDraftItem}
            onSubmit={handleAddItem}
            submitLabel='Save Item'
            onCancel={() => {
              setAddItemOpen(false)
              setDraftItem(emptyDraft)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookingInvoiceItemsTable
