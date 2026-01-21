import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { Eye } from 'lucide-react'
import {
  getAllInvoicesbyTerritoryId,
  getInvoiceDetailsById,
} from '@/services/reports/invoiceReports'
import { useAppSelector } from '@/store/hooks'
import type {
  BookingInvoice,
  BookingInvoiceReportItem,
} from '@/types/invoice'
import { formatDate as formatDateTime } from '@/lib/format-date'
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'
import InvoiceSummaryFilter, {
  type InvoiceSummaryFilterValues,
} from './InvoiceSummaryFilter'
import InvoiceSummaryStats from './InvoiceSummaryStats'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommonAlert } from '@/components/common-alert'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CountBadge } from '@/components/ui/count-badge'
import FullWidthDialog from '@/components/FullWidthDialog'
import InvoiceNumber from '@/components/InvoiceNumber'
import BookingInvoiceDetailsHeader from '@/components/agency-module/booking-invoice-details-header'
import BookingInvoiceItemsTable from '@/components/agency-module/booking-invoice-items-table'

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const deriveStatus = (row: BookingInvoice | BookingInvoiceReportItem) => {
  if (row.isReversed) return 'Reversed'
  if (row.isLateDelivery) return 'Late Delivery'
  if (row.isActual) return 'Actual'
  if (row.isBook) return 'Booked'
  return 'Pending'
}

const InvoiceSummary = () => {
  const user = useAppSelector((s) => s.auth.user)
  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  const defaultDates = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return {
      startDate: toIso(startOfMonth),
      endDate: toIso(endOfMonth),
    }
  }, [])
  const [hasRequested, setHasRequested] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const invoicesMutation = useMutation({
    mutationFn: (payload: {
      userId: number
      territoryId?: number
      startDate: string
      endDate: string
    }) => getAllInvoicesbyTerritoryId(payload),
  })

  const rows = useMemo<BookingInvoice[]>(
    () => (invoicesMutation.data?.payload ?? []) as BookingInvoice[],
    [invoicesMutation.data]
  )

  const openInvoiceById = useCallback(async (invoice: BookingInvoice) => {
    setDetailError(null)
    setIsDetailLoading(true)
    try {
      const invoiceId =
        typeof invoice.id === 'number' && Number.isFinite(invoice.id)
          ? invoice.id
          : Number(invoice.invoiceNo) || 0
      if (!invoiceId) throw new Error('Invalid invoice id')
      const res = await getInvoiceDetailsById(invoiceId)
      const payload =
        (res as { payload?: BookingInvoiceReportItem })?.payload ?? res
      const merged = payload
        ? { ...(invoice as BookingInvoice), ...payload }
        : invoice
      setSelectedInvoice(merged as BookingInvoiceReportItem)
      setInvoicePreviewOpen(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load invoice details'
      setDetailError(message)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const columns = useMemo<ColumnDef<BookingInvoice>[]>(
    () => [
      {
        accessorKey: 'invoiceNo',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Invoice Id' />
        ),
        cell: ({ row }) => (
          <InvoiceNumber
            invoiceId={row.original.invoiceNo}
            className='pl-2 font-medium text-slate-900 dark:text-slate-50'
          />
        ),
        meta: { thClassName: 'pl-2' },
      },
      {
        accessorKey: 'invoiceType',
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Invoice Type'
            className='w-full justify-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.invoiceType ?? '-'}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'totalBookFinalValue',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Booking Value'
            className='w-full justify-end'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-right tabular-nums'>
            {formatPrice(row.original.totalBookFinalValue)}
          </span>
        ),
        meta: { thClassName: 'text-right' },
      },
      {
        accessorKey: 'dateBook',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Booking Date'
            className='w-full justify-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {formatDateTime(row.original.dateBook)}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'sourceApp',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Source'
            className='w-full justify-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.sourceApp ?? '-'}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        id: 'status',
        accessorFn: (original) => deriveStatus(original),
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Status'
            className='w-full justify-center'
          />
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          return (
            <div className='flex justify-center'>
              <span
                className={cn('rounded-full px-2 py-1 text-xs font-semibold', {
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200':
                    status === 'Booked',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200':
                    status === 'Actual',
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200':
                    status === 'Late Delivery',
                  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200':
                    status === 'Reversed',
                  'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200':
                    status === 'Pending',
                })}
              >
                {status}
              </span>
            </div>
          )
        },
        meta: { thClassName: 'text-center' },
        sortingFn: (a, b) =>
          deriveStatus(a.original).localeCompare(deriveStatus(b.original)),
      },
      {
        id: 'actions',
        header: () => <div className='text-center'>Action</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center justify-center'>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  onClick={() => openInvoiceById(row.original)}
                  disabled={isDetailLoading}
                >
                  <Eye className='h-4 w-4' />
                  <span className='sr-only'>View Invoice Details</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top' align='center'>
                View Invoice Details
              </TooltipContent>
            </Tooltip>
          </div>
        ),
        meta: { thClassName: 'text-center' },
      },
    ],
    [isDetailLoading, openInvoiceById]
  )

  const selectedInvoiceFresh = useMemo(() => {
    if (!selectedInvoice) return null
    const refreshed = rows.find((row) => row.id === selectedInvoice.id)
    if (!refreshed) return selectedInvoice
    return { ...refreshed, ...selectedInvoice }
  }, [rows, selectedInvoice])

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    getRowId: (row) => String(row.id ?? row.invoiceNo),
  })

  const tableRows = table.getRowModel().rows
  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const isLoading = invoicesMutation.isPending
  const isError = invoicesMutation.isError
  const error = invoicesMutation.error
  const showNoData = hasRequested && !isLoading && !isError && rows.length === 0
  const invoiceTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        rows
          .map((row) => row.invoiceType)
          .filter((val): val is string => Boolean(val))
      )
    )
    return values.map((value) => ({ label: value, value }))
  }, [rows])
  const statusFilterOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => deriveStatus(row)))
    )
    return values.map((value) => ({ label: value, value }))
  }, [rows])

  useEffect(() => {
    const userId = user?.userId
    if (!userId || hasRequested) return
    setHasRequested(true)
    invoicesMutation.mutate({
      userId,
      territoryId: user?.territoryId,
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
    })
  }, [
    user?.userId,
    user?.territoryId,
    defaultDates.startDate,
    defaultDates.endDate,
    hasRequested,
    invoicesMutation,
  ])

  const handleApply = (next: InvoiceSummaryFilterValues) => {
    const userId = user?.userId
    if (!userId) {
      toast.error('Unable to load invoices without user context')
      return
    }
    if (!next.startDate || !next.endDate) return
    setHasRequested(true)
    invoicesMutation.mutate({
      userId,
      territoryId: user?.territoryId,
      startDate: next.startDate,
      endDate: next.endDate,
    })
  }

  return (
    <Card className='space-y-4'>
      <CardContent className='space-y-4'>
        <InvoiceSummaryFilter
          initialStartDate={defaultDates.startDate}
          initialEndDate={defaultDates.endDate}
          onApply={handleApply}
          onReset={() => {
            const userId = user?.userId
            if (!userId) return
            setHasRequested(true)
            invoicesMutation.mutate({
              userId,
              territoryId: user?.territoryId,
              startDate: defaultDates.startDate,
              endDate: defaultDates.endDate,
            })
          }}
        />
        <p className='text-xs font-medium text-slate-500 dark:text-slate-300'>
          Summary values reflect invoices within the selected date range.
        </p>
        <InvoiceSummaryStats rows={rows} />
        {!hasRequested ? (
          <CommonAlert
            variant='info'
            title='Apply filters to load invoices'
            description='Select a date range, then click Apply Filter.'
          />
        ) : null}
        {isLoading ? (
          <div className='mt-4 mb-4 rounded-md border'>
            <Table className='text-xs'>
              <TableHeader>
                <TableRow>
                {columns.map((col, colIdx) => (
                  <TableHead
                    key={String(col.id ?? colIdx)}
                    className='h-10 bg-gray-100 px-3 text-left dark:bg-gray-900'
                  >
                      {typeof col.header === 'string'
                        ? col.header
                        : 'Loading...'}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({
                  length: table.getState().pagination.pageSize,
                }).map((_, idx) => (
                  <TableRow key={idx}>
                    {columns.map((_, colIdx) => (
                      <TableCell
                        key={`${idx}-${colIdx}`}
                        className='px-3 py-1 align-middle'
                      >
                        <div className='h-5 w-full rounded-sm bg-slate-200/80 dark:bg-slate-800/60' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        {!isLoading && !isError && rows.length > 0 ? (
          <>
          <DataTableToolbar
            table={table}
            searchPlaceholder='Search invoice id...'
            searchKey='invoiceNo'
            filters={[
              {
                columnId: 'invoiceType',
                title: 'Invoice Type',
                options: invoiceTypeOptions,
              },
              {
                columnId: 'status',
                title: 'Status',
                options: statusFilterOptions,
                },
              ]}
            rightContent={
              <CountBadge value={`${filteredCount}/${totalCount}`} />
            }
          />
            <div className='mt-4 mb-4 rounded-md border'>
              <Table className='text-xs'>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            'h-10 bg-gray-100 px-3 text-left dark:bg-gray-900 ' +
                            (header.column.columnDef.meta?.thClassName ?? '')
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {tableRows.length ? (
                    tableRows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className='px-3 align-middle'
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='h-20 text-center'
                      >
                        No invoices match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </>
        ) : null}
        {isError ? (
          <CommonAlert
            variant='error'
            title='Failed to load invoices'
            description={error instanceof Error ? error.message : undefined}
          />
        ) : null}
        {showNoData ? (
          <CommonAlert
            variant='info'
            title='No invoices found'
            description='Try a different date range.'
          />
        ) : null}
        {detailError ? (
          <p className='text-sm text-red-600'>{detailError}</p>
        ) : null}
        <FullWidthDialog
          title='Invoice Details'
          open={invoicePreviewOpen}
          onOpenChange={(open) => {
            setInvoicePreviewOpen(open)
            if (!open) {
              setSelectedInvoice(null)
            }
          }}
          width='full'
        >
          {selectedInvoiceFresh ? (
            <div className='space-y-3'>
              <BookingInvoiceDetailsHeader
                invoice={selectedInvoiceFresh}
                status={deriveStatus(selectedInvoiceFresh)}
                formatDate={formatDate}
              />
              <div
                className='[&_div.flex.items-center.justify-between>div:last-child]:hidden [&_div.flex.justify-end.gap-3.pt-2]:hidden [&_table tr]:pointer-events-none [&_table tr]:cursor-not-allowed [&_input]:pointer-events-none'
                onClickCapture={(e) => e.stopPropagation()}
                onDoubleClickCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => e.stopPropagation()}
                onKeyDownCapture={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
                }}
              >
                <BookingInvoiceItemsTable
                  invoice={selectedInvoiceFresh}
                  items={selectedInvoiceFresh.invoiceDetailDTOList ?? []}
                  onUpdated={() => {
                    setInvoicePreviewOpen(false)
                    setSelectedInvoice(null)
                  }}
                  userId={user?.userId ?? null}
                  onCancel={() => {
                    setInvoicePreviewOpen(false)
                    setSelectedInvoice(null)
                  }}
                />
              </div>
            </div>
          ) : null}
        </FullWidthDialog>
      </CardContent>
    </Card>
  )
}

export default InvoiceSummary
