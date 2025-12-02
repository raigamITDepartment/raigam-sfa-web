import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type {
  BookingInvoice,
  BookingInvoiceDetailDTO,
  BookingInvoiceReportItem,
} from '@/types/invoice'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { updateBookingInvoiceWithDetails } from '@/services/sales/invoice/invoiceApi'
import { formatPrice } from '@/lib/format-price'

type BookingInvoiceItemsTableProps = {
  invoice: BookingInvoiceReportItem
  items: BookingInvoiceDetailDTO[]
  onUpdated?: (payload?: BookingInvoice | null) => void
  userId?: number | null
  onCancel?: () => void
}

type EditableField =
  | 'totalBookQty'
  | 'totalCancelQty'
  | 'sellUnitPrice'
  | 'discountPercentage'
  | 'goodReturnTotalQty'
  | 'goodReturnUnitPrice'
  | 'goodReturnFreeQty'
  | 'marketReturnTotalQty'
  | 'marketReturnUnitPrice'
  | 'marketReturnFreeQty'
  | 'totalFreeQty'

const safeNumber = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : 0

const recalcDerivedValues = (item: BookingInvoiceDetailDTO) => {
  const bookQty = safeNumber(item.totalBookQty)
  const cancelQty = safeNumber(item.totalCancelQty)
  const actualQty = Math.max(bookQty - cancelQty, 0)
  const unitPrice = safeNumber(item.sellUnitPrice)
  const discountPct =
    item.discountPercentage ?? item.bookDiscountPercentage ?? 0

  const totalBookValue = bookQty * unitPrice
  const totalBookDiscountValue = (totalBookValue * discountPct) / 100
  const totalBookSellValue = totalBookValue - totalBookDiscountValue
  const actualGrossValue = actualQty * unitPrice
  const totalActualDiscountValue = (actualGrossValue * discountPct) / 100
  const sellTotalPrice = actualGrossValue - totalActualDiscountValue

  const goodReturnQty = safeNumber(item.goodReturnTotalQty)
  const goodReturnFreeQty = safeNumber(item.goodReturnFreeQty)
  const goodReturnUnitPrice = safeNumber(item.goodReturnUnitPrice)
  const effectiveGoodReturnQty = Math.max(goodReturnQty - goodReturnFreeQty, 0)
  const goodReturnTotalVal = effectiveGoodReturnQty * goodReturnUnitPrice

  const marketReturnQty = safeNumber(item.marketReturnTotalQty)
  const marketReturnFreeQty = safeNumber(item.marketReturnFreeQty)
  const marketReturnUnitPrice = safeNumber(item.marketReturnUnitPrice)
  const effectiveMarketReturnQty = Math.max(
    marketReturnQty - marketReturnFreeQty,
    0
  )
  const marketReturnTotalVal =
    effectiveMarketReturnQty * marketReturnUnitPrice

  const finalTotalValue =
    sellTotalPrice - goodReturnTotalVal - marketReturnTotalVal

  return {
    ...item,
    totalBookSellValue,
    totalBookDiscountValue,
    sellTotalPrice,
    totalBookValue,
    totalBookFinalValue: totalBookSellValue,
    totalDiscountValue: totalActualDiscountValue,
    totalActualQty: actualQty,
    totalActualValue: finalTotalValue,
    goodReturnTotalVal,
    marketReturnTotalVal,
    finalTotalValue,
  }
}

export function BookingInvoiceItemsTable({
  invoice,
  items,
  onUpdated,
  userId,
  onCancel,
}: BookingInvoiceItemsTableProps) {
  const [summaryDiscount, setSummaryDiscount] = useState(
    invoice.discountPercentage ?? 0
  )
  const [editableItems, setEditableItems] = useState<BookingInvoiceDetailDTO[]>(
    () => items.map((item) => recalcDerivedValues(item))
  )
  useEffect(() => {
    setEditableItems(items.map((item) => recalcDerivedValues(item)))
  }, [items])

  useEffect(() => {
    setSummaryDiscount(invoice.discountPercentage ?? 0)
  }, [invoice.discountPercentage])

  const handleSummaryDiscountChange = (rawValue: string) => {
    const parsedNumber = Number(rawValue)
    const next =
      Number.isFinite(parsedNumber) && parsedNumber >= 0
        ? Math.min(parsedNumber, 100)
        : 0
    setSummaryDiscount(next)
  }

  const handleValueChange = (
    itemId: number,
    field: EditableField,
    rawValue: string
  ) => {
    const trimmed = rawValue.trim()
    const parsedNumber = Number(trimmed)
    const parsed =
      trimmed === '' || Number.isNaN(parsedNumber) ? null : parsedNumber

    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const baseUpdated = {
          ...item,
          [field]: parsed,
        }
        return recalcDerivedValues(baseUpdated)
      })
    )
  }
  const resetChanges = () => {
    setEditableItems(items.map((item) => recalcDerivedValues(item)))
  }

  const aggregatedTotals = useMemo(() => {
    return editableItems.reduce(
      (acc, item) => {
        const gross = safeNumber(item.totalBookValue ?? 0)
        const sellValue = safeNumber(item.totalBookSellValue ?? 0)
        const bookFinalValue = safeNumber(item.totalBookFinalValue ?? 0)
        const finalValue = safeNumber(item.finalTotalValue ?? 0)
        const actualGrossValue =
          safeNumber(item.totalActualQty) * safeNumber(item.sellUnitPrice)
        const actualDiscountValue = safeNumber(
          item.totalDiscountValue ?? item.totalBookDiscountValue
        )
        acc.totalBookValue += gross
        acc.totalBookSellValue += sellValue
        acc.totalBookFinalValue += bookFinalValue
        acc.totalCancelValue +=
          safeNumber(item.totalCancelQty) * safeNumber(item.sellUnitPrice)
        acc.totalMarketReturnValue += safeNumber(item.marketReturnTotalVal)
        acc.totalGoodReturnValue += safeNumber(item.goodReturnTotalVal)
        acc.totalFreeValue +=
          safeNumber(item.totalFreeQty) * safeNumber(item.sellUnitPrice)
        acc.totalActualGrossValue += actualGrossValue
        acc.totalActualValue += finalValue
        acc.totalDiscountValue += actualDiscountValue
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
  }, [editableItems])

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

  const mutation = useMutation({
    mutationFn: updateBookingInvoiceWithDetails,
    onSuccess: (res) => {
      toast.success(res.message ?? 'Invoice updated successfully')
      onUpdated?.(res.payload)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update invoice'
      toast.error(message)
    },
  })

  if (!editableItems.length) {
    return (
      <div className='rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300'>
        No line items available for this invoice.
      </div>
    )
  }

  const headerLabels = [
    'Item No',
    'Item Name',
    'Book Qty',
    'Cancel Qty',
    'Actual Qty',
    'Item Price',
    'Gross Total',
    'Discount (%)',
    'Discount Value',
    'Discount After Total',
    'Good Return Qty',
    'Good Return Price',
    'Good Return Free Qty',
    'GR Total Value',
    'Market Return Qty',
    'Market Return Price',
    'Market Return Free Qty',
    'MR Total Value',
    'Grand Total',
  ]

  const handleSave = () => {
    const resolvedUserId = userId ?? invoice.userId
    if (!resolvedUserId) {
      toast.error('Missing user id for invoice update')
      return
    }

    const payload = {
      id: invoice.id,
      userId: resolvedUserId,
      territoryId: invoice.territoryId,
      agencyWarehouseId: invoice.agencyWarehouseId,
      routeId: invoice.routeId,
      rangeId: invoice.rangeId,
      outletId: invoice.outletId,
      totalBookValue: totals.totalBookValue,
      totalBookSellValue: totals.totalBookSellValue,
      totalBookFinalValue: totals.totalBookFinalValue,
      totalCancelValue: totals.totalCancelValue,
      totalMarketReturnValue: totals.totalMarketReturnValue,
      totalGoodReturnValue: totals.totalGoodReturnValue,
      totalFreeValue: totals.totalFreeValue,
      totalActualValue: totals.totalActualValue,
      totalDiscountValue: totals.totalDiscountValue,
      discountPercentage: summaryDiscount,
      invoiceType: invoice.invoiceType,
      sourceApp: invoice.sourceApp,
      longitude: invoice.longitude,
      latitude: invoice.latitude,
      isReversed: invoice.isReversed,
      isPrinted: invoice.isPrinted,
      isBook: invoice.isBook,
      isActual: invoice.isActual,
      isLateDelivery: invoice.isLateDelivery,
      invActualBy: invoice.invActualBy ?? 0,
      invReversedBy: invoice.invReversedBy ?? 0,
      invUpdatedBy: invoice.invUpdatedBy ?? 0,
      isActive: invoice.isActive,
      invoiceDetailDTOList: editableItems.map((item) => {
        const discountPct =
          item.discountPercentage ?? item.bookDiscountPercentage ?? 0
        return {
          id: item.id || undefined,
          itemId: item.itemId,
          sellPriceId: item.sellPriceId,
          sellUnitPrice: safeNumber(item.sellUnitPrice),
          totalBookQty: safeNumber(item.totalBookQty),
          bookDiscountPercentage: discountPct,
          totalBookDiscountValue: safeNumber(item.totalBookDiscountValue),
          totalBookValue: safeNumber(item.totalBookValue),
          totalBookSellValue: safeNumber(item.totalBookSellValue),
          totalBookFinalValue: safeNumber(item.finalTotalValue),
          totalCancelQty: safeNumber(item.totalCancelQty),
          totalFreeQty: safeNumber(item.totalFreeQty),
          totalActualQty: safeNumber(item.totalActualQty),
          totalDiscountValue: safeNumber(
            item.totalDiscountValue ?? item.totalBookDiscountValue
          ),
          discountPercentage: discountPct,
          sellTotalPrice: safeNumber(item.sellTotalPrice),
          goodReturnPriceId: item.goodReturnPriceId,
          goodReturnUnitPrice: safeNumber(item.goodReturnUnitPrice),
          goodReturnFreeQty: safeNumber(item.goodReturnFreeQty),
          goodReturnTotalQty: safeNumber(item.goodReturnTotalQty),
          goodReturnTotalVal: safeNumber(item.goodReturnTotalVal),
          marketReturnPriceId: item.marketReturnPriceId,
          marketReturnUnitPrice: safeNumber(item.marketReturnUnitPrice),
          marketReturnFreeQty: safeNumber(item.marketReturnFreeQty),
          marketReturnTotalQty: safeNumber(item.marketReturnTotalQty),
          marketReturnTotalVal: safeNumber(item.marketReturnTotalVal),
          finalTotalValue: safeNumber(item.finalTotalValue),
          isActive: item.isActive,
        }
      }),
    }
    mutation.mutate(payload)
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
          Invoice Items
        </p>
        <span className='text-muted-foreground text-xs'>
          {editableItems.length} item{editableItems.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className='space-y-4'>
        <div className='rounded-md border border-slate-200 p-4 dark:border-slate-800'>
          <div className='max-h-[65vh] overflow-auto rounded-md border border-slate-200 dark:border-slate-800'>
            <Table className='min-w-[1200px] text-xs [&_[data-slot=table-row]]:hover:bg-transparent'>
              <TableHeader>
                <TableRow className='bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400'>
                  {headerLabels.map((label) => (
                    <TableHead
                      key={label}
                      className='px-3 py-2 text-center text-[10px] font-semibold tracking-[0.2em]'
                    >
                      <span
                        className={
                          label === 'Item Name'
                            ? undefined
                            : label === 'Action'
                              ? undefined
                              : 'whitespace-pre-line'
                        }
                      >
                        {label === 'Item Name'
                          ? label
                          : label === 'Action'
                            ? label
                            : label.replace(/\s+/g, '\n')}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
                <TableBody>
                  {editableItems.map((item, idx) => (
                    <TableRow
                      key={item.id ?? `item-${idx}`}
                      className={`text-slate-800 dark:text-slate-100 ${
                        idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900/70'
                          : 'bg-slate-50 dark:bg-slate-900'
                      }`}
                    >
                      <TableCell className='px-3 py-2 font-medium'>
                        {item.itemId}
                      </TableCell>
                      <TableCell className='max-w-[240px] px-3 py-2 font-medium whitespace-normal text-slate-900 dark:text-white'>
                        <span className='block truncate'>{item.itemName}</span>
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.totalBookQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'totalBookQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.totalCancelQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'totalCancelQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-center'>
                        {formatPrice(item.totalActualQty)}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.sellUnitPrice ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'sellUnitPrice',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        {formatPrice(
                          safeNumber(item.totalActualQty) *
                            safeNumber(item.sellUnitPrice)
                        )}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={
                            item.discountPercentage ??
                            item.bookDiscountPercentage ??
                            ''
                          }
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'discountPercentage',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        {formatPrice(item.totalDiscountValue)}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        {formatPrice(item.sellTotalPrice)}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.goodReturnTotalQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'goodReturnTotalQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.goodReturnUnitPrice ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'goodReturnUnitPrice',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.goodReturnFreeQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'goodReturnFreeQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right text-rose-600 dark:text-rose-300'>
                        -{formatPrice(item.goodReturnTotalVal)}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.marketReturnTotalQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'marketReturnTotalQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.marketReturnUnitPrice ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'marketReturnUnitPrice',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        <Input
                          type='number'
                          value={item.marketReturnFreeQty ?? ''}
                          onChange={(e) =>
                            handleValueChange(
                              item.id,
                              'marketReturnFreeQty',
                              e.target.value
                            )
                          }
                          className='h-8 w-24 rounded-sm text-right'
                        />
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right text-rose-600 dark:text-rose-300'>
                        -{formatPrice(item.marketReturnTotalVal)}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right'>
                        {formatPrice(item.finalTotalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter />
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
              <Input
                type='number'
                min={0}
                max={100}
                step='0.01'
                value={summaryDiscount}
                onChange={(e) => handleSummaryDiscountChange(e.target.value)}
                className='h-8 w-24 rounded-sm text-right text-sm'
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
          <div className='mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800'>
            <button
              className='rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
              onClick={() => {
                resetChanges()
                onCancel?.()
              }}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              className='inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-70'
              onClick={handleSave}
              disabled={mutation.isPending || !editableItems.length}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingInvoiceItemsTable
