import { Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/format-price'
import { formatNegativeValue, safeNumber } from '@/lib/invoice-calcs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type InvoiceItemRow = {
  id: number
  itemId: number
  itemName: string
  unitPrice: number
  adjustedUnitPrice: number
  grossValue: number
  discountAfterValue: number
  totalBookQty: number
  totalCancelQty: number
  totalBookValue: number
  totalFreeQty: number
  bookDiscountPercentage: number | null
  discountPercentage: number
  totalBookDiscountValue: number
  discountValue: number
  totalBookSellValue: number
  goodReturnUnitPrice: number
  goodReturnAdjustedUnitPrice: number
  goodReturnTotalQty: number
  goodReturnFreeQty: number
  goodReturnTotalVal: number
  marketReturnUnitPrice: number
  marketReturnAdjustedUnitPrice: number
  marketReturnTotalQty: number
  marketReturnFreeQty: number
  marketReturnTotalVal: number
  finalTotalValue: number
}

export type AggregatedTotals = {
  totalBookValue: number
  totalBookSellValue: number
  totalBookFinalValue: number
  totalCancelQty: number
  totalCancelValue: number
  totalMarketReturnValue: number
  totalGoodReturnValue: number
  totalFreeQty: number
  totalFreeValue: number
  totalActualValue: number
  totalActualGrossValue: number
  totalDiscountValue: number
  totalFinalValue: number
}

type InvoiceItemsTableLayoutProps = {
  tableRows: InvoiceItemRow[]
  aggregatedTotals: AggregatedTotals
  totals: AggregatedTotals
  summaryDiscountPct: number
  onSummaryDiscountChange: (val: number) => void
  onAddItem: () => void
  onUpdate: () => void
  onCancel?: () => void
  isUpdating?: boolean
  onRowClick?: (rowIndex: number) => void
  onDeleteRow?: (rowIndex: number) => void
  rowClickHint?: string
  updateLabel?: string
  updateDisabled?: boolean
}

export function InvoiceItemsTableLayout({
  tableRows,
  aggregatedTotals,
  totals,
  summaryDiscountPct,
  onSummaryDiscountChange,
  onAddItem,
  onUpdate,
  onCancel,
  isUpdating,
  onRowClick,
  onDeleteRow,
  rowClickHint,
  updateLabel = 'Update',
  updateDisabled = false,
}: InvoiceItemsTableLayoutProps) {
  const baseHeaderSurface = 'h-10 px-3 text-center'
  const headerTopClass = `${baseHeaderSurface} border border-slate-300 text-[11px] font-semibold dark:border-slate-800`
  const headerSubClass = `${baseHeaderSurface} border border-slate-300 text-[10px] font-semibold dark:border-slate-800`
  const goodReturnCellClass = 'bg-emerald-50/60 dark:bg-emerald-900/20'
  const marketReturnCellClass = 'bg-amber-50/60 dark:bg-amber-900/20'

  const showDelete = typeof onDeleteRow === 'function'
  const topHeaders = [
    {
      label: 'Item No',
      rowSpan: 2,
      className: `${headerTopClass} min-w-[50px]`,
    },
    {
      label: 'Item Name',
      rowSpan: 2,
      className: `${headerTopClass} min-w-[200px]`,
    },
    { label: 'Unit Price(Rs.)', rowSpan: 2, className: headerTopClass },
    {
      label: 'Adjusted Unit Price(Rs.)',
      rowSpan: 2,
      className: headerTopClass,
    },
    { label: 'Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Cancel Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Total Book Value(Rs.)', rowSpan: 2, className: headerTopClass },
    { label: 'Free Issue Qty', rowSpan: 2, className: headerTopClass },
    { label: 'Discount (%)', rowSpan: 2, className: headerTopClass },
    {
      label: 'Item Discount Value (Rs.)',
      rowSpan: 2,
      className: headerTopClass,
    },
    {
      label: 'Total Book Sell Value(Rs.)',
      rowSpan: 2,
      className: headerTopClass,
    },
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
    {
      label: 'Total(Rs.)',
      rowSpan: 2,
      className: `${headerTopClass} min-w-[110px]`,
    },
    ...(showDelete
      ? [
          {
            label: 'Action',
            rowSpan: 2,
            className: `${headerTopClass} min-w-[80px]`,
          },
        ]
      : []),
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

  const totalColumnCount = topHeaders.reduce(
    (sum, header) => sum + (header.colSpan ?? 1),
    0
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
            Invoice Items{' '}
            <Badge variant='secondary'>
              {tableRows.length} item{tableRows.length > 1 ? 's' : ''}
            </Badge>
          </p>
          <div className='text-muted-foreground text-xs'>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  className='inline-flex items-center gap-2'
                  onClick={onAddItem}
                >
                  <Plus className='h-4 w-4' />
                  Add Item
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>Click here add new item</p>
              </TooltipContent>
            </Tooltip>
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
                      <TableHead
                        key={`${label}-${idx}`}
                        className={headerSubClass}
                      >
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={totalColumnCount}
                        className='py-8 text-center text-sm text-slate-500 dark:text-slate-300'
                      >
                        No line items added yet. Use “Add Item” to start
                        building the invoice.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {tableRows.map((row, idx) => {
                    const rowContent = (
                      <TableRow
                        key={row.id ?? `row-${idx}`}
                        className={`text-slate-800 transition-colors dark:text-slate-100 ${onRowClick ? 'cursor-pointer' : ''} ${
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50 dark:bg-slate-900/70'
                        } hover:bg-slate-100 hover:dark:bg-slate-800/60 [&>td]:border [&>td]:border-slate-200 [&>td]:px-2 [&>td]:py-2 dark:[&>td]:border-slate-800/70`}
                        onClick={() => onRowClick?.(idx)}
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
                        <TableCell className='bg-blue-50 text-right tabular-nums dark:bg-blue-900/30'>
                          {formatPrice(row.totalBookValue)}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {safeNumber(row.totalFreeQty)}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {safeNumber(
                            row.bookDiscountPercentage ?? row.discountPercentage
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatPrice(
                            safeNumber(
                              row.totalBookDiscountValue ?? row.discountValue
                            )
                          )}
                        </TableCell>
                        <TableCell className='bg-blue-50 text-right tabular-nums dark:bg-blue-900/30'>
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
                        <TableCell className='bg-blue-50 text-right font-semibold dark:bg-blue-900/30'>
                          {formatPrice(row.finalTotalValue)}
                        </TableCell>
                        {showDelete ? (
                          <TableCell className='text-center'>
                            <Button
                              type='button'
                              size='icon'
                              variant='ghost'
                              className='h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30'
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteRow?.(idx)
                              }}
                            >
                              <Trash2 className='h-4 w-4' />
                              <span className='sr-only'>Delete item</span>
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )

                    return onRowClick ? (
                      <Tooltip key={row.id ?? `row-${idx}`} delayDuration={0}>
                        <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
                        <TooltipContent
                          side='top'
                          align='center'
                          sideOffset={4}
                        >
                          <p>{rowClickHint ?? 'Click to update this item'}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      rowContent
                    )
                  })}
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
                    <TableCell className='bg-blue-50 text-right tabular-nums dark:bg-blue-900/30'>
                      {formatPrice(aggregatedTotals.totalBookValue)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {safeNumber(aggregatedTotals.totalFreeQty)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className='bg-blue-50 text-right tabular-nums dark:bg-blue-900/30'>
                      {formatPrice(aggregatedTotals.totalBookSellValue)}
                    </TableCell>
                    <TableCell className={goodReturnCellClass} />
                    <TableCell className={goodReturnCellClass} />
                    <TableCell className={goodReturnCellClass} />
                    <TableCell className={goodReturnCellClass} />
                    <TableCell
                      className={`${goodReturnCellClass} text-right text-rose-600 dark:text-rose-300`}
                    >
                      {formatNegativeValue(
                        aggregatedTotals.totalGoodReturnValue
                      )}
                    </TableCell>
                    <TableCell className={marketReturnCellClass} />
                    <TableCell className={marketReturnCellClass} />
                    <TableCell className={marketReturnCellClass} />
                    <TableCell className={marketReturnCellClass} />
                    <TableCell
                      className={`${marketReturnCellClass} text-right text-rose-600 dark:text-rose-300`}
                    >
                    {formatNegativeValue(
                      aggregatedTotals.totalMarketReturnValue
                    )}
                    </TableCell>
                    <TableCell className='bg-blue-50 text-right font-semibold dark:bg-blue-900/30'>
                      {formatPrice(aggregatedTotals.totalFinalValue)}
                    </TableCell>
                    {showDelete ? <TableCell /> : null}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <div className='ml-auto w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold lg:w-80 xl:w-96 dark:border-slate-800 dark:bg-slate-900/40'>
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
                  onChange={(e) =>
                    onSummaryDiscountChange(Number(e.target.value) || 0)
                  }
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
            className='w-46'
            variant='outline'
            onClick={() => {
              if (onCancel) onCancel()
            }}
          >
            Cancel
          </Button>
          <Button
            className='w-46'
            onClick={onUpdate}
            disabled={isUpdating || updateDisabled}
          >
            {isUpdating ? 'Saving...' : updateLabel}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default InvoiceItemsTableLayout
