import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { getAllAvailableBookingInvoices } from '@/services/reports/invoiceReports'
import type { BookingInvoiceReportItem } from '@/types/invoice'
import { cancelInvoice } from '@/services/sales/invoice/invoiceApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { Pencil, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import InvoiceNumber from '@/components/InvoiceNumber'
import BookingInvoiceFilter, {
  type BookingInvoiceFilters,
} from '@/components/agency-module/filter'
import BookingInvoiceDetailsHeader from '@/components/agency-module/booking-invoice-details-header'
import BookingInvoiceItemsTable from '@/components/agency-module/booking-invoice-items-table'
import BookingInvoiceTableSection from '@/components/agency-module/booking-invoice-table-section'
import { DataTableColumnHeader } from '@/components/data-table'
import { setFilters as setStoredFilters } from '@/store/bookingInvoiceSlice'
import FullWidthDialog from '@/components/FullWidthDialog'
import { formatPrice } from '@/lib/format-price'

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const deriveStatus = (row: BookingInvoiceReportItem) => {
  if (row.isReversed) return 'Reversed'
  if (row.isLateDelivery) return 'Late Delivery'
  if (row.isActual) return 'Actual'
  if (row.isBook) return 'Booked'
  return 'Pending'
}

const BookingInvoice = () => {
  const user = useAppSelector((s) => s.auth.user)
  const savedFilters = useAppSelector((s) => s.bookingInvoice.filters)
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  const defaultDates = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      startDate: toIso(startOfMonth),
      endDate: toIso(today),
    }
  }, [])

  const [filters, setFilters] = useState<BookingInvoiceFilters>(() => {
    return (
      savedFilters ?? {
        startDate: defaultDates.startDate,
        endDate: defaultDates.endDate,
        invoiceType: 'ALL',
      }
    )
  })
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelRemark, setCancelRemark] = useState('')
  const [cancelTarget, setCancelTarget] =
    useState<BookingInvoiceReportItem | null>(null)
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (vars: {
      invoiceId: number | string
      userId: number | string
    }) => cancelInvoice(vars.invoiceId, vars.userId),
    onSuccess: (res, vars) => {
      const invoiceLabel = cancelTarget?.invoiceNo ?? vars.invoiceId
      const message =
        res?.message ||
        `Invoice ${invoiceLabel} canceled successfully${
          cancelRemark ? ` (Remark: ${cancelRemark})` : ''
        }`
      toast.success(message)
      queryClient.invalidateQueries({
        queryKey: ['booking-invoices', user?.territoryId],
      })
      setCancelDialogOpen(false)
      setCancelRemark('')
      setCancelTarget(null)
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel invoice'
      toast.error(message)
    },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'booking-invoices',
      user?.territoryId,
      filters.startDate,
      filters.endDate,
      filters.invoiceType,
    ],
    enabled: Boolean(user?.territoryId),
    staleTime: 1000 * 60 * 5, // cache for 5 minutes to avoid unnecessary reloads
    gcTime: 1000 * 60 * 10, // retain data for 10 minutes between navigations
    refetchOnMount: (query) => query.state.data === undefined,
    refetchOnWindowFocus: false,
    queryFn: () => {
      const invoiceTypeParam =
        filters.invoiceType === 'ALL' ? '' : filters.invoiceType
      const payload = {
        territoryId: user?.territoryId ?? 0,
        startDate: filters.startDate ?? defaultDates.startDate,
        endDate: filters.endDate ?? defaultDates.endDate,
        invoiceType: invoiceTypeParam,
      }
      return getAllAvailableBookingInvoices(payload).then((res) => {
        console.log('[booking-invoice] getAllAvailableBookingInvoices response', res)
        return res
      })
    },
  })

  const columns = useMemo<ColumnDef<BookingInvoiceReportItem>[]>(
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
        accessorKey: 'discountPercentage',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Discount %'
            className='w-full justify-end'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-right tabular-nums'>
            {row.original.discountPercentage.toFixed(2)}
          </span>
        ),
        meta: { thClassName: 'text-right' },
      },
      {
        accessorKey: 'totalDiscountValue',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Discount Value'
            className='w-full justify-end'
          />
        ),
        cell: ({ row }) => (
            <span className='block text-right tabular-nums'>
              {formatPrice(row.original.totalDiscountValue)}
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
            {formatDate(row.original.dateBook)}
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
          <div className='flex items-center justify-center gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              onClick={() => {
                setSelectedInvoice(row.original)
                setInvoicePreviewOpen(true)
              }}
            >
              <Pencil className='h-4 w-4' />
              <span className='sr-only'>Edit</span>
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 text-rose-600 hover:text-rose-700'
              onClick={() => {
                setCancelTarget(row.original)
                setCancelRemark('')
                setCancelDialogOpen(true)
              }}
              disabled={cancelInvoiceMutation.isPending}
            >
              <XCircle className='h-4 w-4' />
              <span className='sr-only'>Cancel invoice</span>
            </Button>
          </div>
        ),
        meta: { thClassName: 'text-center' },
      },
    ],
    []
  )

  const rows = useMemo(
    () => (data && 'payload' in data ? data.payload ?? [] : []),
    [data]
  )
  const selectedInvoiceFresh = useMemo(() => {
    if (!selectedInvoice) return null
    const refreshed = rows.find((row) => row.id === selectedInvoice.id)
    return refreshed ?? selectedInvoice
  }, [rows, selectedInvoice])
  const statusFilterOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((row) => set.add(deriveStatus(row)))
    return Array.from(set).map((status) => ({
      label: status,
      value: status,
    }))
  }, [rows])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <Card className='space-y-4'>
      <CardContent>
        <BookingInvoiceFilter
          initialStartDate={defaultDates.startDate}
          initialEndDate={defaultDates.endDate}
          initialInvoiceType='ALL'
          onApply={(next) => {
            setFilters(next)
            dispatch(setStoredFilters(next))
          }}
          onReset={() => {
            const defaults: BookingInvoiceFilters = {
              startDate: defaultDates.startDate,
              endDate: defaultDates.endDate,
              invoiceType: 'ALL',
            }
            setFilters(defaults)
            dispatch(setStoredFilters(defaults))
          }}
        />
        <BookingInvoiceTableSection
          table={table}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          error={error}
          rows={rows}
          statusFilterOptions={statusFilterOptions}
        />
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                Canceling will mark this invoice as canceled and may not be
                reversible. Please provide a remark before confirming.
              </AlertDialogDescription>
              {cancelTarget?.invoiceNo ? (
                <p className='text-sm text-slate-600 dark:text-slate-300'>
                  Invoice:{' '}
                  <InvoiceNumber
                    invoiceId={cancelTarget.invoiceNo}
                    className='font-semibold text-slate-900 dark:text-slate-100'
                  />
                </p>
              ) : null}
            </AlertDialogHeader>
            <div className='space-y-2'>
              <p className='text-sm text-slate-600 dark:text-slate-300'>
                Please enter a cancel remark.
              </p>
              <Textarea
                value={cancelRemark}
                onChange={(e) => setCancelRemark(e.target.value)}
                placeholder='Enter cancel remark'
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                className='border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800'
                onClick={() => {
                  setCancelDialogOpen(false)
                  setCancelRemark('')
                  setCancelTarget(null)
                }}
                disabled={cancelInvoiceMutation.isPending}
              >
                Close
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!cancelTarget?.id) {
                    toast.error('Missing invoice id')
                    return
                  }
                  if (!user?.userId) {
                    toast.error('Missing user id')
                    return
                  }
                  cancelInvoiceMutation.mutate({
                    invoiceId: cancelTarget.id,
                    userId: user.userId,
                  })
                }}
                disabled={
                  !cancelRemark.trim() || cancelInvoiceMutation.isPending
                }
                className='bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-70'
              >
                {cancelInvoiceMutation.isPending
                  ? 'Canceling...'
                  : 'Confirm Cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
              <BookingInvoiceItemsTable
                invoice={selectedInvoiceFresh}
                items={selectedInvoiceFresh.invoiceDetailDTOList ?? []}
                onUpdated={() => {
                  queryClient.invalidateQueries({
                    queryKey: [
                      'booking-invoices',
                      user?.territoryId,
                      filters.startDate,
                      filters.endDate,
                      filters.invoiceType,
                    ],
                  })
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
          ) : null}
        </FullWidthDialog>
      </CardContent>
    </Card>
  )
}

export default BookingInvoice
