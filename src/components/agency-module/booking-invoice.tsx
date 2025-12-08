import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  findInvoicePrintExtraDetailsByRequiredArgs,
  getAllAvailableBookingInvoices,
} from '@/services/reports/invoiceReports'
import type { BookingInvoiceReportItem, InvoiceTypeParam } from '@/types/invoice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { CommonDialog } from '@/components/common-dialog'
import { formatPrice } from '@/lib/format-price'
import { createCombinedInvoicesPdf, createInvoicePdf } from '@/components/agency-module/InvoicePdfButton'

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
  const [rowSelection, setRowSelection] = useState({})
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [extraDetails, setExtraDetails] = useState<Record<string, unknown>>({})
  const [isFetchingExtras, setIsFetchingExtras] = useState(false)
  const [isBuildingPdfs, setIsBuildingPdfs] = useState(false)
  const [extrasError, setExtrasError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'booking-invoices',
      user?.territoryId,
      filters.startDate,
      filters.endDate,
      filters.invoiceType,
      defaultDates.startDate,
      defaultDates.endDate,
    ],
    enabled: Boolean(user?.territoryId),
    staleTime: 1000 * 60 * 5, // cache for 5 minutes to avoid unnecessary reloads
    gcTime: 1000 * 60 * 10, // retain data for 10 minutes between navigations
    refetchOnMount: (query) => query.state.data === undefined,
    refetchOnWindowFocus: false,
    queryFn: () => {
      const invoiceTypeParam: InvoiceTypeParam =
        filters.invoiceType === 'ALL' ? '' : (filters.invoiceType as InvoiceTypeParam)
      const payload = {
        territoryId: user?.territoryId ?? 0,
        startDate: filters.startDate ?? defaultDates.startDate,
        endDate: filters.endDate ?? defaultDates.endDate,
        invoiceType: invoiceTypeParam,
      }
      return getAllAvailableBookingInvoices(payload)
    },
  })

  const columns = useMemo<ColumnDef<BookingInvoiceReportItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className='flex items-center justify-center pl-1 pr-2'>
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label='Select all'
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className='flex items-center justify-center pl-1 pr-2'>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label='Select row'
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-12 text-center' },
        size: 48,
      },
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
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => String(row.id ?? row.invoiceNo),
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

  const selectedInvoices = useMemo(() => {
    const selectedIds = new Set(
      Object.entries(rowSelection)
        .filter(([, isSelected]) => Boolean(isSelected))
        .map(([key]) => key)
    )
    return rows.filter((row) => {
      const id = String(row.id ?? row.invoiceNo)
      return selectedIds.has(id)
    })
  }, [rowSelection, rows])

  useEffect(() => {
    const loadExtras = async () => {
      if (!printDialogOpen || !selectedInvoices.length) return
      setIsFetchingExtras(true)
      setExtrasError(null)
      try {
        const results = await Promise.all(
          selectedInvoices.map(async (invoice) => {
            const invoiceId =
              typeof invoice.id === 'number' && Number.isFinite(invoice.id)
                ? invoice.id
                : Number(invoice.invoiceNo) || 0
            const res = await findInvoicePrintExtraDetailsByRequiredArgs({
              territoryId: invoice.territoryId ?? user?.territoryId ?? 0,
              routeId: invoice.routeId ?? 0,
              outletId: invoice.outletId ?? 0,
              invoiceId,
              userId: user?.userId ?? 0,
            })
            return {
              key: invoice.id ?? invoice.invoiceNo,
              data: res?.payload ?? res,
            }
          })
        )
        const map: Record<string, unknown> = {}
        results.forEach((r) => {
          if (r.key) map[String(r.key)] = r.data
        })
        setExtraDetails(map)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load details'
        setExtrasError(message)
      } finally {
        setIsFetchingExtras(false)
      }
    }
    loadExtras()
  }, [printDialogOpen, selectedInvoices, user?.territoryId, user?.userId])

  const downloadSelectedInvoices = async () => {
    const freshSelected = table
      .getSelectedRowModel()
      .flatRows.map((row) => row.original as BookingInvoiceReportItem)
    if (!freshSelected.length) return
    try {
      setIsBuildingPdfs(true)
      const pdfBytes = await createCombinedInvoicesPdf(freshSelected, extraDetails)
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Try to open in a new tab for quick viewing; fallback to download if blocked.
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        const link = document.createElement('a')
        link.href = url
        link.download =
          freshSelected.length === 1
            ? `invoice-${freshSelected[0].invoiceNo}.pdf`
            : `invoices-${freshSelected.length}.pdf`
        link.click()
      }

      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      setIsBuildingPdfs(false)
    }
  }

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
          onPrintClick={() => setPrintDialogOpen(true)}
          isPrintDisabled={selectedInvoices.length === 0}
        />
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
                      defaultDates.startDate,
                      defaultDates.endDate,
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
        <CommonDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          title='Print Selected Invoices'
          description={
            selectedInvoices.length
              ? `You have selected ${selectedInvoices.length} invoice${
                  selectedInvoices.length > 1 ? 's' : ''
                } to print.`
              : 'No invoices selected.'
          }
          primaryAction={{
            label: isBuildingPdfs ? 'Building PDFs...' : 'Download PDFs',
            onClick: downloadSelectedInvoices,
            disabled: selectedInvoices.length === 0 || isBuildingPdfs,
          }}
          secondaryAction={{
            label: 'Close',
            variant: 'outline',
            onClick: () => setPrintDialogOpen(false),
          }}
          bodyClassName='space-y-3'
        >
          {selectedInvoices.length ? (
            <div className='space-y-4'>
              <div className='flex justify-end'>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={isBuildingPdfs}
                  onClick={downloadSelectedInvoices}
                >
                  {isBuildingPdfs ? 'Building PDF…' : 'Download PDF'}
                </Button>
              </div>
              {extrasError ? (
                <p className='text-sm text-red-600'>{extrasError}</p>
              ) : null}
              <div className='max-h-[70vh] space-y-4 overflow-y-auto pr-1'>
                {selectedInvoices.map((invoice) => {
                  const extra = extraDetails[String(invoice.id ?? invoice.invoiceNo)]
                  const showLoading = isFetchingExtras && !extra
                  return (
                    <div
                      key={`extra-${invoice.id ?? invoice.invoiceNo}`}
                      className='rounded border bg-muted/10'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2'>
                        <div className='text-sm font-semibold text-slate-900 dark:text-slate-50'>
                          Invoice <InvoiceNumber invoiceId={invoice.invoiceNo} />
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Type: {invoice.invoiceType ?? '-'} | Date:{' '}
                          {formatDate(invoice.dateBook)} | Status:{' '}
                          {deriveStatus(invoice)}
                        </div>
                      </div>
                      <div className='space-y-3 p-3 text-xs'>
                        <div className='rounded bg-white p-3 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'>
                          <div className='mb-2 text-[11px] uppercase text-muted-foreground'>
                            Booking Invoice Payload
                          </div>
                          <pre className='whitespace-pre-wrap break-words text-[11px] leading-relaxed'>
                            {JSON.stringify(invoice, null, 2)}
                          </pre>
                        </div>
                        <div className='rounded bg-white p-3 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'>
                          <div className='mb-2 text-[11px] uppercase text-muted-foreground'>
                            Extra Print Details (from findInvoicePrintExtraDetailsByRequiredArgs)
                          </div>
                          {showLoading ? (
                            <p className='text-[11px] text-muted-foreground'>
                              Loading extra details...
                            </p>
                          ) : extra ? (
                            <pre className='whitespace-pre-wrap break-words text-[11px] leading-relaxed'>
                              {JSON.stringify(extra, null, 2)}
                            </pre>
                          ) : (
                            <p className='text-[11px] text-muted-foreground'>
                              No extra details returned for this invoice.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Select at least one invoice to print.
            </p>
          )}
        </CommonDialog>
      </CardContent>
    </Card>
  )
}

export default BookingInvoice
