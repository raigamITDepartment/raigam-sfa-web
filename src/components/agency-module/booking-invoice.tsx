import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  cancelInvoiceWithRemark,
  updateBookingInvoiceToActual,
  updateBookingInvoiceToLateDelivery,
} from '@/services/sales/invoice/invoiceApi'
import { setFilters as setStoredFilters } from '@/store/bookingInvoiceSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type {
  BookingInvoiceReportItem,
  InvoiceTypeParam,
} from '@/types/invoice'
import { Pencil, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'
import { SubRoleId } from '@/lib/authz'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import FullWidthDialog from '@/components/FullWidthDialog'
import InvoiceNumber from '@/components/InvoiceNumber'
import { createCombinedInvoicesPdf } from '@/components/agency-module/InvoicePdfButton'
import BookingInvoiceDetailsHeader from '@/components/agency-module/booking-invoice-details-header'
import BookingInvoiceItemsTable from '@/components/agency-module/booking-invoice-items-table'
import BookingInvoiceTableSection from '@/components/agency-module/booking-invoice-table-section'
import BookingInvoiceFilter, {
  type BookingInvoiceFilters,
} from '@/components/agency-module/filter'
import { CommonDialog } from '@/components/common-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import { DataTableColumnHeader } from '@/components/data-table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getTerritoriesByAreaId } from '@/services/userDemarcation/endpoints'

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
  const baseTerritoryId = Number(
    user?.territoryId ?? user?.agencyTerritoryId ?? 0
  )
  const roleId = Number(user?.subRoleId ?? user?.roleId)
  const isAreaRole =
    roleId === SubRoleId.AreaSalesManager ||
    roleId === SubRoleId.AreaSalesExecutive
  const defaultDates = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      startDate: toIso(startOfMonth),
      endDate: toIso(today),
    }
  }, [])
  const [filters, setFilters] = useState<BookingInvoiceFilters>(() => {
    if (savedFilters) {
      return {
        ...savedFilters,
        territoryId: isAreaRole
          ? savedFilters.territoryId
          : savedFilters.territoryId ??
              (baseTerritoryId > 0 ? baseTerritoryId : undefined),
      }
    }
    return {
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
      invoiceType: 'ALL',
      territoryId: isAreaRole
        ? undefined
        : baseTerritoryId > 0
          ? baseTerritoryId
          : undefined,
    }
  })
  const [rowSelection, setRowSelection] = useState({})
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [extraDetails, setExtraDetails] = useState<Record<string, unknown>>({})
  const [isBuildingPdfs, setIsBuildingPdfs] = useState(false)
  const [extrasError, setExtrasError] = useState<string | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [pendingBulkStatus, setPendingBulkStatus] = useState<{
    invoices: BookingInvoiceReportItem[]
    nextStatus: 'ACTUAL' | 'LATE_DELIVERY' | 'CANCEL'
  } | null>(null)
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false)
  const [statusSelectResetCounter, setStatusSelectResetCounter] = useState(0)
  const [cancelRemark, setCancelRemark] = useState('')
  const areaId = user?.areaIds?.[0]
  const { data: territoryList } = useQuery({
    queryKey: ['territories-by-area', areaId],
    enabled: isAreaRole && Boolean(areaId),
    queryFn: () => getTerritoriesByAreaId(areaId as number),
  })
  const territoryOptions = useMemo(() => {
    const list = Array.isArray(territoryList)
      ? territoryList
      : territoryList?.payload
    const safeList = Array.isArray(list) ? list : []
    return safeList.map((territory) => ({
      value: Number(territory.id),
      label:
        territory.territoryName ??
        territory.name ??
        String(territory.id),
    }))
  }, [territoryList])
  const effectiveTerritoryId = Number(
    filters.territoryId ?? baseTerritoryId
  )

  const invalidateRelatedTabs = useCallback(
    async (status: 'ACTUAL' | 'LATE_DELIVERY') => {
      const key =
        status === 'ACTUAL' ? 'actual-invoices' : 'late-delivery-invoices'
      await queryClient.invalidateQueries({ queryKey: [key] })
      await queryClient.refetchQueries({ queryKey: [key], type: 'active' })
    },
    [queryClient]
  )

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'booking-invoices',
      effectiveTerritoryId,
      filters.startDate,
      filters.endDate,
      filters.invoiceType,
      defaultDates.startDate,
      defaultDates.endDate,
    ],
    enabled: effectiveTerritoryId > 0,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes to avoid unnecessary reloads
    gcTime: 1000 * 60 * 10, // retain data for 10 minutes between navigations
    refetchOnMount: (query) => query.state.data === undefined,
    refetchOnWindowFocus: false,
    queryFn: () => {
      const invoiceTypeParam: InvoiceTypeParam =
        filters.invoiceType === 'ALL'
          ? ''
          : (filters.invoiceType as InvoiceTypeParam)
      const payload = {
        territoryId: effectiveTerritoryId,
        startDate: filters.startDate ?? defaultDates.startDate,
        endDate: filters.endDate ?? defaultDates.endDate,
        invoiceType: invoiceTypeParam,
      }
      return getAllAvailableBookingInvoices(payload)
    },
  })

  const handleBulkStatusChange = useCallback(
    async (
      invoices: BookingInvoiceReportItem[],
      nextStatus: 'ACTUAL' | 'LATE_DELIVERY' | 'CANCEL',
      remark?: string
    ) => {
      if (!invoices.length) {
        toast.error('Select at least one invoice to update')
        return
      }
      const userId = user?.userId
      if (!userId) {
        toast.error('Unable to update invoices without user context')
        return
      }
      const label =
        nextStatus === 'ACTUAL'
          ? 'Actual'
          : nextStatus === 'LATE_DELIVERY'
            ? 'Late Delivery'
            : 'Canceled'
      let successCount = 0
      let failureCount = 0
      for (const invoice of invoices) {
        const invoiceId =
          typeof invoice.id === 'number' && Number.isFinite(invoice.id)
            ? invoice.id
            : Number(invoice.invoiceNo) || 0
        if (!invoiceId) {
          failureCount += 1
          toast.error(
            `Unable to determine id for invoice ${invoice.invoiceNo ?? ''}`
          )
          continue
        }
        try {
          if (nextStatus === 'CANCEL') {
            await cancelInvoiceWithRemark(
              invoiceId,
              userId,
              remark ?? ''
            )
          } else if (nextStatus === 'ACTUAL') {
            await updateBookingInvoiceToActual(invoiceId, userId)
          } else {
            await updateBookingInvoiceToLateDelivery(invoiceId, userId)
          }
          successCount += 1
        } catch (err) {
          failureCount += 1
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to update invoice status.'
          toast.error(
            `Invoice ${invoice.invoiceNo ?? invoiceId}: ${message}`
          )
        }
      }
      if (successCount) {
        const summary =
          successCount === 1
            ? `Invoice updated to ${label}.`
            : `${successCount} invoices updated to ${label}.`
        toast.success(summary)
        await refetch()
        if (nextStatus === 'ACTUAL' || nextStatus === 'LATE_DELIVERY') {
          await invalidateRelatedTabs(nextStatus)
        } else {
          await queryClient.invalidateQueries({
            queryKey: ['canceled-invoices'],
          })
        }
      }
      if (!successCount && failureCount) {
        toast.error('Failed to update the selected invoices.')
      }
    },
    [invalidateRelatedTabs, refetch, user?.userId, queryClient]
  )

  const columns = useMemo<ColumnDef<BookingInvoiceReportItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className='flex items-center justify-center pr-2 pl-1'>
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label='Select all'
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className='flex items-center justify-center pr-2 pl-1'>
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
                  onClick={() => {
                    setSelectedInvoice(row.original)
                    setInvoicePreviewOpen(true)
                  }}
                >
                  <Pencil className='h-4 w-4' />
                  <span className='sr-only'>Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top' align='center'>
                Click Edit Invoice
              </TooltipContent>
            </Tooltip>
          </div>
        ),
        meta: { thClassName: 'text-center' },
      },
    ],
    []
  )

  const rows = useMemo(
    () => (data && 'payload' in data ? (data.payload ?? []) : []),
    [data]
  )
  const selectedInvoiceFresh = useMemo(() => {
    if (!selectedInvoice) return null
    const refreshed = rows.find((row) => row.id === selectedInvoice.id)
    return refreshed ?? selectedInvoice
  }, [rows, selectedInvoice])

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
  const isPrintDisabled = selectedInvoices.length === 0
  const hasEligibleStatusChange = selectedInvoices.length > 0

  const handlePrintSelected = useCallback(() => {
    setPrintDialogOpen(true)
    refetch()
  }, [refetch])

  const toolbarRightContent = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        className='h-8 gap-2 px-3'
        onClick={handlePrintSelected}
        disabled={isPrintDisabled}
      >
        <Printer className='h-4 w-4' />
        Print Selected
      </Button>
      <Select
        key={`bulk-status-${statusSelectResetCounter}`}
        disabled={!hasEligibleStatusChange || isBulkStatusUpdating}
        onValueChange={(value) => {
          if (value === 'actual' || value === 'late' || value === 'cancel') {
            triggerBulkStatusChange(value)
          }
        }}
      >
        <SelectTrigger
          size='sm'
          className='min-w-[160px] justify-between'
        >
          <SelectValue placeholder='Change Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='actual'>Actual</SelectItem>
          <SelectItem value='late'>Late Delivery</SelectItem>
          <SelectItem value='cancel'>Cancel</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  useEffect(() => {
    const loadExtras = async () => {
      if (!printDialogOpen || !selectedInvoices.length) return
      setExtrasError(null)
      try {
        const results = await Promise.all(
          selectedInvoices.map(async (invoice) => {
            const invoiceId =
              typeof invoice.id === 'number' && Number.isFinite(invoice.id)
                ? invoice.id
                : Number(invoice.invoiceNo) || 0
            const res = await findInvoicePrintExtraDetailsByRequiredArgs({
              territoryId: invoice.territoryId ?? effectiveTerritoryId,
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
        const message =
          err instanceof Error ? err.message : 'Failed to load details'
        setExtrasError(message)
      }
    }
    loadExtras()
  }, [printDialogOpen, selectedInvoices, effectiveTerritoryId, user?.userId])

  const revokePreviewUrl = () => {
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const getFreshSelected = useCallback(
    () =>
      table
        .getSelectedRowModel()
        .flatRows.map((row) => row.original as BookingInvoiceReportItem),
    [table]
  )

  const triggerBulkStatusChange = useCallback(
    (value: 'actual' | 'late' | 'cancel') => {
      const selected = getFreshSelected()
      if (!selected.length) {
        toast.error('Select at least one invoice to update')
        setStatusSelectResetCounter((prev) => prev + 1)
        return
      }
      setPendingBulkStatus({
        invoices: selected,
        nextStatus:
          value === 'actual'
            ? 'ACTUAL'
            : value === 'late'
              ? 'LATE_DELIVERY'
              : 'CANCEL',
      })
      if (value === 'cancel') {
        setCancelRemark('')
      }
      setStatusSelectResetCounter((prev) => prev + 1)
    },
    [getFreshSelected]
  )

  const buildPdfPreview = async () => {
    const freshSelected = getFreshSelected()
    if (!freshSelected.length) {
      revokePreviewUrl()
      return
    }
    setIsBuildingPdfs(true)
    setPreviewError(null)
    try {
      const pdfBytes = await createCombinedInvoicesPdf(
        freshSelected,
        extraDetails
      )
      const pdfBuffer: ArrayBuffer = new Uint8Array(pdfBytes).buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to build PDF preview'
      setPreviewError(message)
    } finally {
      setIsBuildingPdfs(false)
    }
  }

  const downloadSelectedInvoices = async () => {
    const freshSelected = getFreshSelected()
    if (!freshSelected.length) return
    try {
      setIsBuildingPdfs(true)
      const pdfBytes = await createCombinedInvoicesPdf(
        freshSelected,
        extraDetails
      )
      const pdfBuffer: ArrayBuffer = new Uint8Array(pdfBytes).buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
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

  const openPreviewInNewTab = () => {
    if (!pdfPreviewUrl) return
    window.open(pdfPreviewUrl, '_blank', 'noopener,noreferrer')
  }

  const printPreview = () => {
    if (!pdfPreviewUrl) return
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = pdfPreviewUrl
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 500)
    }
    document.body.appendChild(iframe)
  }

  useEffect(() => {
    if (!printDialogOpen) {
      revokePreviewUrl()
      setPreviewError(null)
      return
    }
    buildPdfPreview()
  }, [printDialogOpen, selectedInvoices, extraDetails])

  useEffect(() => {
    return () => {
      revokePreviewUrl()
    }
  }, [])

  return (
    <Card className='space-y-4'>
      <CardContent>
        <ConfirmDialog
          open={Boolean(pendingBulkStatus)}
          destructive
          onOpenChange={(open) => {
            if (!open) {
              setPendingBulkStatus(null)
              setCancelRemark('')
            }
          }}
          title='Confirm Status Update'
          desc={
            pendingBulkStatus ? (
              <div className='flex flex-wrap items-center gap-1'>
                <span>Do you want to mark</span>
                <span className='font-semibold text-slate-900 dark:text-slate-50'>
                  {pendingBulkStatus.invoices.length} invoice
                  {pendingBulkStatus.invoices.length > 1 ? 's' : ''}
                </span>
                <span>
                  as{' '}
                  {pendingBulkStatus.nextStatus === 'ACTUAL'
                    ? 'Actual'
                    : pendingBulkStatus.nextStatus === 'LATE_DELIVERY'
                      ? 'Late Delivery'
                      : 'Canceled'}
                  ?
                </span>
              </div>
            ) : (
              ''
            )
          }
          cancelBtnText='No'
          confirmText='Yes'
          disabled={
            pendingBulkStatus?.nextStatus === 'CANCEL' &&
            !cancelRemark.trim().length
          }
          handleConfirm={async () => {
            if (!pendingBulkStatus) return
            setIsBulkStatusUpdating(true)
            try {
              await handleBulkStatusChange(
                pendingBulkStatus.invoices,
                pendingBulkStatus.nextStatus,
                cancelRemark.trim()
              )
            } finally {
              setIsBulkStatusUpdating(false)
              setPendingBulkStatus(null)
              setCancelRemark('')
            }
          }}
          isLoading={isBulkStatusUpdating}
        >
          {pendingBulkStatus?.nextStatus === 'CANCEL' ? (
            <div className='mt-3'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-200'>
                Why cancel this invoice?
              </label>
              <Textarea
                className='mt-2'
                placeholder='Add cancel reason...'
                value={cancelRemark}
                onChange={(event) => setCancelRemark(event.target.value)}
                rows={3}
              />
            </div>
          ) : null}
        </ConfirmDialog>
        <BookingInvoiceFilter
          initialStartDate={defaultDates.startDate}
          initialEndDate={defaultDates.endDate}
          initialInvoiceType='ALL'
          initialTerritoryId={isAreaRole ? undefined : filters.territoryId}
          territoryOptions={isAreaRole ? territoryOptions : undefined}
          onApply={(next) => {
            setFilters(next)
            dispatch(setStoredFilters(next))
          }}
          onReset={() => {
            const defaults: BookingInvoiceFilters = {
              startDate: defaultDates.startDate,
              endDate: defaultDates.endDate,
              invoiceType: 'ALL',
              territoryId: isAreaRole
                ? undefined
                : baseTerritoryId > 0
                  ? baseTerritoryId
                  : undefined,
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
          statusFilterOptions={[]}
          toolbarRightContent={toolbarRightContent}
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
                        effectiveTerritoryId,
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
          contentClassName='sm:max-w-6xl md:max-w-[1200px] w-[95vw]'
          primaryAction={{
            label: isBuildingPdfs ? 'Building PDF…' : 'Print',
            onClick: printPreview,
            disabled:
              selectedInvoices.length === 0 || isBuildingPdfs || !pdfPreviewUrl,
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
              <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={buildPdfPreview}
                  disabled={isBuildingPdfs}
                >
                  {isBuildingPdfs ? 'Building…' : 'Refresh Preview'}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={openPreviewInNewTab}
                  disabled={!pdfPreviewUrl || isBuildingPdfs}
                >
                  Open in new tab
                </Button>
                <Button
                  size='sm'
                  variant='default'
                  onClick={printPreview}
                  disabled={!pdfPreviewUrl || isBuildingPdfs}
                >
                  Print
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  onClick={downloadSelectedInvoices}
                  disabled={isBuildingPdfs}
                >
                  {isBuildingPdfs ? 'Building…' : 'Download'}
                </Button>
              </div>
              {extrasError ? (
                <p className='text-sm text-red-600'>{extrasError}</p>
              ) : null}
              {previewError ? (
                <p className='text-sm text-red-600'>{previewError}</p>
              ) : null}
              <div className='overflow-hidden rounded border bg-white shadow-sm dark:bg-slate-900'>
                {isBuildingPdfs && !pdfPreviewUrl ? (
                  <div className='text-muted-foreground p-4 text-sm'>
                    Building PDF preview...
                  </div>
                ) : pdfPreviewUrl ? (
                  <iframe
                    title='Invoice PDF Preview'
                    src={pdfPreviewUrl}
                    className='h-[70vh] w-full'
                  />
                ) : (
                  <div className='text-muted-foreground p-4 text-sm'>
                    Select invoices and refresh to view the PDF preview.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              Select at least one invoice to print.
            </p>
          )}
        </CommonDialog>
      </CardContent>
    </Card>
  )
}

export default BookingInvoice
