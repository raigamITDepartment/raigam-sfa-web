import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from "@/components/ui/badge"
import { formatPrice } from '@/lib/format-price'
import { findItemPriceById } from '@/services/sales/itemPriceApi'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { updateBookingInvoiceWithDetails } from '@/services/sales/invoice/invoiceApi'
import ItemForm, { type ItemFormValues } from './ItemForm'

type BookingInvoiceItemsTableProps = {
  invoice: BookingInvoiceReportItem
  items: BookingInvoiceDetailDTO[]
  onUpdated?: (payload?: BookingInvoice | null) => void
  userId?: number | null
  onCancel?: () => void
}

const safeNumber = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : 0

const formatNegativeValue = (value?: number | null) => {
  const formatted = formatPrice(value)
  return formatted === '-' ? formatted : `-${formatted}`
}

const computeFinalTotal = (
  totalBookSellValue: number,
  goodReturnTotalVal: number,
  marketReturnTotalVal: number
) =>
  Number((totalBookSellValue - goodReturnTotalVal - marketReturnTotalVal).toFixed(2))

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
  const effectiveGoodReturnQty = Math.max(goodReturnQty - goodReturnFreeQty, 0)
  const goodReturnTotalVal = safeNumber(
    item.goodReturnTotalVal ?? effectiveGoodReturnQty * goodReturnUnitPrice
  )

  const marketReturnQty = safeNumber(item.marketReturnTotalQty)
  const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
  const marketReturnUnitPrice = safeNumber(item.marketReturnUnitPrice)
  const effectiveMarketReturnQty = Math.max(
    marketReturnQty - marketReturnFreeQty,
    0
  )
  const marketReturnTotalVal = safeNumber(
    item.marketReturnTotalVal ?? effectiveMarketReturnQty * marketReturnUnitPrice
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
  }
}

type InvoiceItemRow = BookingInvoiceDetailDTO & {
  netBookQty: number
  unitPrice: number
  discountPct: number
  discountValue: number
  grossValue: number
  discountAfterValue: number
  adjustedUnitPrice: number
  freeIssueQty: number
  goodReturnPayingQty: number
  goodReturnAdjustedUnitPrice: number
  marketReturnPayingQty: number
  marketReturnAdjustedUnitPrice: number
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
    totalBookQty: null,
    totalCancelQty: null,
    totalBookValue: null,
    totalFreeQty: null,
    bookDiscountPercentage: null,
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
    const goodReturnTotalVal = safeNumber(next.goodReturnTotalVal)
    const marketReturnTotalVal = safeNumber(next.marketReturnTotalVal)
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
      goodReturnPriceId: next.goodReturnPriceId ?? null,
      goodReturnFreeQty: safeNumber(next.goodReturnFreeQty),
      goodReturnTotalQty: safeNumber(next.goodReturnTotalQty),
      goodReturnTotalVal,
      marketReturnPriceId: next.marketReturnPriceId ?? null,
      marketReturnUnitPrice: safeNumber(next.marketReturnUnitPrice),
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
        const finalTotalValue = computeFinalTotal(
          totalBookSellValue,
          safeNumber(item.goodReturnTotalVal),
          safeNumber(item.marketReturnTotalVal)
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
          goodReturnFreeQty: safeNumber(item.goodReturnFreeQty),
          goodReturnTotalQty: safeNumber(item.goodReturnTotalQty),
          goodReturnTotalVal: safeNumber(item.goodReturnTotalVal),
          marketReturnPriceId: item.marketReturnPriceId ?? null,
          marketReturnUnitPrice: safeNumber(item.marketReturnUnitPrice),
          marketReturnFreeQty: safeNumber(item.marketReturnFreeQty),
          marketReturnTotalQty: safeNumber(item.marketReturnTotalQty),
          marketReturnTotalVal: safeNumber(item.marketReturnTotalVal),
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
        (item as Record<string, unknown>)?.adjustedUnitPrice ?? rawSellUnitPrice
      )
      const freeIssueQty = safeNumber(item.totalFreeQty)

      const goodReturnQty = safeNumber(item.goodReturnTotalQty)
      const goodReturnFreeQty = safeNumber(item.goodReturnFreeQty)
      const goodReturnUnitPrice = safeNumber(item.goodReturnUnitPrice)
      const goodReturnPayingQty = Math.max(
        goodReturnQty - goodReturnFreeQty,
        0
      )
      const goodReturnTotalVal = safeNumber(
        item.goodReturnTotalVal ?? goodReturnPayingQty * goodReturnUnitPrice
      )
      const goodReturnAdjustedUnitPrice = goodReturnUnitPrice

      const marketReturnQty = safeNumber(item.marketReturnTotalQty)
      const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
      const marketReturnUnitPrice = safeNumber(item.marketReturnUnitPrice)
      const marketReturnPayingQty = Math.max(
        marketReturnQty - marketReturnFreeQty,
        0
      )
      const marketReturnTotalVal = safeNumber(item.marketReturnTotalVal)
      const marketReturnAdjustedUnitPrice = marketReturnUnitPrice

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

  const aggregatedTotals = useMemo(() => {
    return tableRows.reduce(
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
          (item as Record<string, unknown>)?.adjustedUnitPrice ?? unitPrice
        )
      const goodReturnVal = safeNumber(item.goodReturnTotalVal)
      const marketReturnVal = safeNumber(item.marketReturnTotalVal)
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

  const totals = useMemo(() => {
    const discountValue =
      (aggregatedTotals.totalFinalValue * summaryDiscountPct) / 100
    const actualValue = aggregatedTotals.totalFinalValue - discountValue
    return {
      ...aggregatedTotals,
      totalDiscountValue: discountValue,
      totalActualValue: actualValue,
    }
  }, [aggregatedTotals, summaryDiscountPct])

  if (!tableRows.length) {
    return (
      <div className='rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300'>
        No line items available for this invoice.
      </div>
    )
  }

  const baseHeaderSurface = 'h-10 px-3 text-center'
  const headerTopClass = `${baseHeaderSurface} border border-slate-300 text-[11px] font-semibold dark:border-slate-800`
  const headerSubClass = `${baseHeaderSurface} border border-slate-300 text-[10px] font-semibold dark:border-slate-800`
  const goodReturnCellClass =
    'bg-emerald-50/60 dark:bg-emerald-900/20'
  const marketReturnCellClass =
    'bg-amber-50/60 dark:bg-amber-900/20'

  const topHeaders = [
    { label: 'Item No', rowSpan: 2, className: `${headerTopClass} min-w-[50px]` },
    { label: 'Item Name', rowSpan: 2, className: `${headerTopClass} min-w-[200px]` },
    { label: 'Unit Price(Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Adjusted Unit Price(Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Cancel Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Total Book Value(Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Free Issue Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Discount (%)', rowSpan: 2, className: headerTopClass },
    { label: 'Item Discount Value (Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Total Book Sell Value(Rs.)', rowSpan: 2, className: headerTopClass },
    {
      label: 'Good Return Details',
      colSpan: 5,
      className: `${headerTopClass} bg-gray-200 dark:bg-gray-900`,
    },
    {
      label: 'Market Return Details',
      colSpan: 5,
      className: `${headerTopClass} bg-gray-200 dark:bg-gray-900`,
    },
    { label: 'Total(Rs.)', rowSpan: 2, className: `${headerTopClass} min-w-[110px]` },
  ]

  const subHeaders = [
    'Unit Price',
    'Adjusted Unit Price',
    'Qty',
    'Free Qty',
    'Total',
    'Unit Price',
    'Adjusted Unit Price',
    'Qty',
    'Free Qty',
    'Total',
  ]

  return (
    <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
            Invoice Items{' '}
            <Badge variant='secondary'>
              {tableRows.length} item{tableRows.length > 1 ? 's' : ''}
            </Badge>
          </p>
          <div className='text-muted-foreground text-xs'>
            <Button
              size='sm'
              className='inline-flex items-center gap-2'
              onClick={() => setAddItemOpen(true)}
            >
              <Plus className='h-4 w-4' />
              Add Item
            </Button>
          </div>
        </div>
      <div className='space-y-4'>
        <div className='rounded-md border border-slate-200 p-1 dark:border-slate-800'>
          <div className='rounded-md border border-slate-200 dark:border-slate-800'>
            <Table className='min-w-[1600px] border border-slate-300 text-xs dark:border-slate-800'>
              <TableHeader>
                <TableRow className='bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-200'>
                  {topHeaders.map((header) => (
                    <TableHead
                      key={header.label}
                      colSpan={header.colSpan}
                      rowSpan={header.rowSpan}
                      className={header.className}
                    >
                      {header.label}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className='bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-200'>
                  {subHeaders.map((label, idx) => (
                    <TableHead key={`${label}-${idx}`} className={headerSubClass}>
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row, idx) => (
                  <TableRow
                    key={row.id ?? `row-${idx}`}
                    className={`text-slate-800 dark:text-slate-100 transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50 dark:bg-slate-900/70'
                    } hover:bg-slate-100 hover:dark:bg-slate-800/60 [&>td]:border [&>td]:border-slate-200 [&>td]:px-2 [&>td]:py-2 dark:[&>td]:border-slate-800/70`}
                  >
                    <TableCell className='text-center font-medium'>
                      {row.itemId}
                    </TableCell>
                    <TableCell className='max-w-[240px] font-medium whitespace-normal text-slate-900 dark:text-white'>
                      <span className='block truncate'>{row.itemName}</span>
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatPrice(row.unitPrice)}
                    </TableCell>
                    <TableCell className='text-right text-slate-700 tabular-nums dark:text-slate-200'>
                      {formatPrice(row.adjustedUnitPrice)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {safeNumber(row.totalBookQty)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {safeNumber(row.totalCancelQty)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums bg-blue-50 dark:bg-blue-900/30'>
                      {formatPrice(row.totalBookValue)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {safeNumber(row.freeIssueQty)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {safeNumber(
                        row.bookDiscountPercentage ?? row.discountPercentage
                      ).toFixed(2)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatPrice(
                        safeNumber(row.totalBookDiscountValue ?? row.discountValue)
                      )}
                    </TableCell>
                    <TableCell className='text-right tabular-nums bg-blue-50 dark:bg-blue-900/30'>
                      {formatPrice(row.totalBookSellValue)}
                    </TableCell>
                    <TableCell
                      className={`${goodReturnCellClass} text-right tabular-nums`}
                    >
                      {formatPrice(row.goodReturnUnitPrice)}
                    </TableCell>
                    <TableCell
                      className={`${goodReturnCellClass} text-right text-slate-700 tabular-nums dark:text-slate-200`}
                    >
                      {formatPrice(row.goodReturnAdjustedUnitPrice)}
                    </TableCell>
                    <TableCell
                      className={`${goodReturnCellClass} text-right tabular-nums`}
                    >
                      {safeNumber(row.goodReturnTotalQty)}
                    </TableCell>
                    <TableCell
                      className={`${goodReturnCellClass} text-right tabular-nums`}
                    >
                      {safeNumber(row.goodReturnFreeQty)}
                    </TableCell>
                    <TableCell
                      className={`${goodReturnCellClass} text-right text-rose-600 dark:text-rose-300`}
                    >
                      {formatNegativeValue(row.goodReturnTotalVal)}
                    </TableCell>
                    <TableCell
                      className={`${marketReturnCellClass} text-right tabular-nums`}
                    >
                      {formatPrice(row.marketReturnUnitPrice)}
                    </TableCell>
                    <TableCell
                      className={`${marketReturnCellClass} text-right text-slate-700 tabular-nums dark:text-slate-200`}
                    >
                      {formatPrice(row.marketReturnAdjustedUnitPrice)}
                    </TableCell>
                    <TableCell
                      className={`${marketReturnCellClass} text-right tabular-nums`}
                    >
                      {safeNumber(row.marketReturnTotalQty)}
                    </TableCell>
                    <TableCell
                      className={`${marketReturnCellClass} text-right tabular-nums`}
                    >
                      {safeNumber(row.marketReturnFreeQty)}
                    </TableCell>
                    <TableCell
                      className={`${marketReturnCellClass} text-right text-rose-600 dark:text-rose-300`}
                    >
                      {formatNegativeValue(row.marketReturnTotalVal)}
                    </TableCell>
                    <TableCell className='text-right font-semibold bg-blue-50 dark:bg-blue-900/30'>
                      {formatPrice(row.finalTotalValue)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className='bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900/50 dark:text-blue-100 [&>td]:border [&>td]:border-blue-200 dark:[&>td]:border-blue-800/60'>
                  <TableCell colSpan={2} className='pl-3'>
                    Totals
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className='text-right tabular-nums'>
                    {safeNumber(aggregatedTotals.totalCancelQty)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums bg-blue-50 dark:bg-blue-900/30'>
                    {formatPrice(aggregatedTotals.totalBookValue)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {safeNumber(aggregatedTotals.totalFreeQty)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className='text-right tabular-nums bg-blue-50 dark:bg-blue-900/30'>
                    {formatPrice(aggregatedTotals.totalBookSellValue)}
                  </TableCell>
                  <TableCell className={goodReturnCellClass} />
                  <TableCell className={goodReturnCellClass} />
                  <TableCell className={goodReturnCellClass} />
                  <TableCell className={goodReturnCellClass} />
                  <TableCell className={`${goodReturnCellClass} text-right text-rose-600 dark:text-rose-300`}>
                    {formatNegativeValue(aggregatedTotals.totalGoodReturnValue)}
                  </TableCell>
                  <TableCell className={marketReturnCellClass} />
                  <TableCell className={marketReturnCellClass} />
                  <TableCell className={marketReturnCellClass} />
                  <TableCell className={marketReturnCellClass} />
                  <TableCell className={`${marketReturnCellClass} text-right text-rose-600 dark:text-rose-300`}>
                    {formatNegativeValue(aggregatedTotals.totalMarketReturnValue)}
                  </TableCell>
                  <TableCell className='text-right font-semibold bg-blue-50 dark:bg-blue-900/30'>
                    {formatPrice(aggregatedTotals.totalFinalValue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <div className='ml-auto w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900/40 lg:w-80 xl:w-96'>
          <div className='space-y-3 text-slate-700 dark:text-slate-200'>
            <div className='flex items-center justify-between'>
              <span>Total</span>
              <span>Rs. {formatPrice(aggregatedTotals.totalFinalValue)}</span>
            </div>
            <div className='flex items-center justify-between gap-2'>
              <span>Discount (%)</span>
              <input
                type='number'
                min='0'
                step='0.01'
                value={summaryDiscountPct}
                onChange={(e) => setSummaryDiscountPct(Number(e.target.value) || 0)}
                className='h-8 w-20 rounded border border-slate-300 bg-white px-2 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800'
              />
            </div>
            <div className='flex items-center justify-between'>
              <span>Discount Value</span>
              <span>Rs. {formatPrice(totals.totalDiscountValue)}</span>
            </div>
            <hr className='border-slate-200 dark:border-slate-700' />
            <div className='flex items-center justify-between text-base font-bold'>
              <span>Grand Total</span>
              <span className='text-blue-600 dark:text-blue-400'>
                Rs. {formatPrice(totals.totalActualValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-3 pt-2'>
        <Button
          variant='outline'
          onClick={() => {
            if (_onCancel) _onCancel()
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Update'}
        </Button>
      </div>

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
