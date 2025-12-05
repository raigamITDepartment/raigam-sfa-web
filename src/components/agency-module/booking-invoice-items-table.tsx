import { useEffect, useMemo, useState } from 'react'
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
import { formatPrice } from '@/lib/format-price'
import { findItemPriceById } from '@/services/sales/itemPriceApi'

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

  const finalTotalValue = safeNumber(
    item.finalTotalValue ??
      discountAfterValue - goodReturnTotalVal - marketReturnTotalVal
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
  const [priceMap, setPriceMap] = useState<Record<number, number>>({})
  const derivedItems = useMemo(
    () => items.map((item) => recalcDerivedValues(item)),
    [items]
  )
  const priceIds = useMemo(() => {
    const ids = new Set<number>()
    items.forEach((item) => {
      if (typeof item.sellPriceId === 'number') ids.add(item.sellPriceId)
      if (typeof item.goodReturnPriceId === 'number') ids.add(item.goodReturnPriceId)
      if (typeof item.marketReturnPriceId === 'number') ids.add(item.marketReturnPriceId)
    })
    return Array.from(ids)
  }, [items])

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
      const adjustedUnitPrice = rawSellUnitPrice
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
  const summaryDiscount = invoice.discountPercentage ?? 0

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
        const goodReturnVal = safeNumber(item.goodReturnTotalVal)
        const marketReturnVal = safeNumber(item.marketReturnTotalVal)
        const finalValue = safeNumber(
          item.finalTotalValue ??
            discountAfterValue -
              goodReturnVal -
              marketReturnVal
        )
        acc.totalBookValue += gross
        acc.totalBookSellValue += discountAfterValue
        acc.totalBookFinalValue += bookFinalValue
        acc.totalCancelValue += cancelQty * unitPrice
        acc.totalMarketReturnValue += marketReturnVal
        acc.totalGoodReturnValue += goodReturnVal
        acc.totalFreeValue += safeNumber(item.totalFreeQty) * unitPrice
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
        totalCancelValue: 0,
        totalMarketReturnValue: 0,
        totalGoodReturnValue: 0,
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
      (aggregatedTotals.totalFinalValue * summaryDiscount) / 100
    const actualValue = aggregatedTotals.totalFinalValue - discountValue
    return {
      ...aggregatedTotals,
      totalDiscountValue: discountValue,
      totalActualValue: actualValue,
    }
  }, [aggregatedTotals, summaryDiscount])

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
    { label: 'Item No', rowSpan: 2, className: `${headerTopClass} min-w-[90px]` },
    { label: 'Item Name', rowSpan: 2, className: `${headerTopClass} min-w-[200px]` },
    { label: 'Unit Price', rowSpan: 2, className: headerTopClass },
    { label: 'Adjusted Unit Price', rowSpan: 2, className: headerTopClass },
    { label: 'Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Cancel Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Total Book Value', rowSpan: 2, className: headerTopClass },
    { label: 'Free Issue Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Discount (%)', rowSpan: 2, className: headerTopClass },
    { label: 'Item Discount Value (Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Total Book Sell Value', rowSpan: 2, className: headerTopClass },
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
    { label: 'Total', rowSpan: 2, className: `${headerTopClass} min-w-[110px]` },
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
          Invoice Items
        </p>
        <span className='text-muted-foreground text-xs'>
          {tableRows.length} item{tableRows.length > 1 ? 's' : ''}
        </span>
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
            <div className='flex items-center justify-between'>
              <span>Discount (%)</span>
              <span>{summaryDiscount}</span>
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
    </div>
  )
}

export default BookingInvoiceItemsTable
