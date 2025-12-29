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
  getInvoiceDetailsById,
  getInvoiceDetailsByStatus,
} from '@/services/reports/invoiceReports'
import { useAppSelector } from '@/store/hooks'
import type {
  BookingInvoiceReportItem,
  InvoiceTypeParam,
} from '@/types/invoice'
import { toast } from 'sonner'
import { Check, Eye, RotateCcw } from 'lucide-react'
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'
import { SubRoleId } from '@/lib/authz'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import {
  approveInvoiceReverseASM,
  reverseApprovalOfActualInvoice,
} from '@/services/sales/invoice/invoiceApi'
import {
  sendReverseApprovalNotification,
  sendReverseCompletedNotification,
  sendReverseRequestNotification,
} from '@/services/notifications'
import { getTerritoriesByAreaId } from '@/services/userDemarcation/endpoints'
import FullWidthDialog from '@/components/FullWidthDialog'
import InvoiceNumber from '@/components/InvoiceNumber'
import { createCombinedInvoicesPdf } from '@/components/agency-module/InvoicePdfButton'
import BookingInvoiceDetailsHeader from '@/components/agency-module/booking-invoice-details-header'
import BookingInvoiceItemsTable from '@/components/agency-module/booking-invoice-items-table'
import BookingInvoiceTableSection from '@/components/agency-module/booking-invoice-table-section'
import BookingInvoiceFilter, {
  type BookingInvoiceFilters,
} from '@/components/agency-module/filter'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CommonDialog } from '@/components/common-dialog'
import { DataTableColumnHeader } from '@/components/data-table'

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const deriveStatus = (row: BookingInvoiceReportItem) => {
  if (row.isReverseReqRep) return 'Reverse Pending'
  if (row.isReversed) return 'Reversed'
  if (row.isLateDelivery) return 'Late Delivery'
  if (row.isActual) return 'Actual'
  if (row.isBook) return 'Booked'
  return 'Pending'
}

const ActualInvoice = () => {
  const user = useAppSelector((s) => s.auth.user)
  const queryClient = useQueryClient()
  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  const baseTerritoryId = Number(
    user?.territoryId ?? user?.agencyTerritoryId ?? 0
  )
  const roleId = Number(user?.subRoleId ?? user?.roleId)
  const isAgent = roleId === SubRoleId.Agent
  const isRep = roleId === SubRoleId.Representative
  const isAreaRole =
    roleId === SubRoleId.AreaSalesManager ||
    roleId === SubRoleId.AreaSalesExecutive
  const isAsm = roleId === SubRoleId.AreaSalesManager
  const isAse = roleId === SubRoleId.AreaSalesExecutive
  const defaultDates = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      startDate: toIso(startOfMonth),
      endDate: toIso(today),
    }
  }, [])
  const [filters, setFilters] = useState<BookingInvoiceFilters>({
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
    invoiceType: 'ALL',
    territoryId: isAreaRole
      ? undefined
      : baseTerritoryId > 0
        ? baseTerritoryId
        : undefined,
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
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [pendingReverseInvoice, setPendingReverseInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [isReverseSubmitting, setIsReverseSubmitting] = useState(false)
  const [pendingApproveInvoice, setPendingApproveInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [isApproveSubmitting, setIsApproveSubmitting] = useState(false)
  const [approveActor, setApproveActor] = useState<'agent' | 'asm' | 'ase'>(
    'agent'
  )
  const [asmRemark, setAsmRemark] = useState('')

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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'actual-invoices',
      effectiveTerritoryId,
      filters.startDate,
      filters.endDate,
      filters.invoiceType,
      defaultDates.startDate,
      defaultDates.endDate,
    ],
    enabled: effectiveTerritoryId > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: (query) => query.state.data === undefined,
    refetchOnWindowFocus: false,
    queryFn: () => {
      const invoiceTypeParam: InvoiceTypeParam =
        filters.invoiceType === 'ALL'
          ? ''
          : (filters.invoiceType as InvoiceTypeParam)
        const payload = {
          invoiceStatus: 'ACTUAL',
          territoryId: effectiveTerritoryId,
          startDate: filters.startDate ?? defaultDates.startDate,
          endDate: filters.endDate ?? defaultDates.endDate,
          invoiceType: invoiceTypeParam,
        }
      return getInvoiceDetailsByStatus(payload)
    },
  })

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
                  'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200':
                    status === 'Reverse Pending',
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
            {isAgent || isAsm || isAse ? (
              row.original.isReverseReqRep && !row.original.isReversed ? (
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      onClick={() => {
                        setPendingApproveInvoice(row.original)
                        setApproveActor(isAsm ? 'asm' : isAse ? 'ase' : 'agent')
                        setAsmRemark('')
                      }}
                      disabled={isDetailLoading}
                    >
                      <Check className='h-4 w-4 text-emerald-700' />
                      <span className='sr-only'>Approve Reverse</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' align='center'>
                    Approve reverse request
                  </TooltipContent>
                </Tooltip>
              ) : null
            ) : isRep &&
              !row.original.isReverseReqRep &&
              !row.original.isReversed ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    onClick={() => setPendingReverseInvoice(row.original)}
                    disabled={isDetailLoading}
                  >
                    <RotateCcw className='h-4 w-4 text-red-700' />
                    <span className='sr-only'>Reverse</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' align='center'>
                  Reverse this invoice
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ),
        meta: { thClassName: 'text-center' },
      },
    ],
    [isAgent, isDetailLoading, isRep]
  )

  const rows = useMemo(
    () => (data && 'payload' in data ? (data.payload ?? []) : []),
    [data]
  )
  const selectedInvoiceFresh = useMemo(() => {
    if (!selectedInvoice) return null
    const refreshed = rows.find((row) => row.id === selectedInvoice.id)
    if (!refreshed) return selectedInvoice
    return { ...refreshed, ...selectedInvoice }
  }, [rows, selectedInvoice])

  const openInvoiceById = async (invoice: BookingInvoiceReportItem) => {
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
      const merged = payload ? { ...invoice, ...payload } : invoice
      setSelectedInvoice(merged)
      setInvoicePreviewOpen(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load invoice details'
      setDetailError(message)
    } finally {
      setIsDetailLoading(false)
    }
  }

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

  const getFreshSelected = () =>
    table
      .getSelectedRowModel()
      .flatRows.map((row) => row.original as BookingInvoiceReportItem)

  const loadInvoiceWithDetails = async (
    invoice: BookingInvoiceReportItem
  ): Promise<BookingInvoiceReportItem> => {
    if (invoice.invoiceDetailDTOList?.length) return invoice
    const invoiceId =
      typeof invoice.id === 'number' && Number.isFinite(invoice.id)
        ? invoice.id
        : Number(invoice.invoiceNo) || 0
    if (!invoiceId) return invoice
    const res = await getInvoiceDetailsById(invoiceId)
    const payload =
      (res as { payload?: BookingInvoiceReportItem })?.payload ?? res
    return payload ? { ...invoice, ...payload } : invoice
  }

  const getSelectedInvoicesWithDetails = async () => {
    const freshSelected = getFreshSelected()
    return Promise.all(freshSelected.map((inv) => loadInvoiceWithDetails(inv)))
  }

  const buildPdfPreview = async () => {
    const detailed = await getSelectedInvoicesWithDetails()
    if (!detailed.length) {
      revokePreviewUrl()
      return
    }
    setIsBuildingPdfs(true)
    setPreviewError(null)
    try {
      const pdfBytes = await createCombinedInvoicesPdf(
        detailed,
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
    const detailed = await getSelectedInvoicesWithDetails()
    if (!detailed.length) return
    try {
      setIsBuildingPdfs(true)
      const pdfBytes = await createCombinedInvoicesPdf(
        detailed,
        extraDetails
      )
      const pdfBuffer: ArrayBuffer = new Uint8Array(pdfBytes).buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        const link = document.createElement('a')
        link.href = url
        link.download =
          detailed.length === 1
            ? `invoice-${detailed[0].invoiceNo}.pdf`
            : `invoices-${detailed.length}.pdf`
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
          open={Boolean(pendingReverseInvoice)}
          destructive
          onOpenChange={(open) => {
            if (!open) {
              setPendingReverseInvoice(null)
            }
          }}
          title='Confirm Reverse'
          desc={
            pendingReverseInvoice ? (
              <div className='flex flex-wrap items-center gap-1'>
                <span>Do you want to reverse invoice</span>
                <InvoiceNumber
                  invoiceId={
                    pendingReverseInvoice.invoiceNo ?? pendingReverseInvoice.id
                  }
                  className='font-semibold text-slate-900 dark:text-slate-50'
                />
                <span>?</span>
              </div>
            ) : (
              ''
            )
          }
          cancelBtnText='No'
          confirmText={isReverseSubmitting ? 'Submitting...' : 'Yes'}
          isLoading={isReverseSubmitting}
          handleConfirm={async () => {
            if (!pendingReverseInvoice || !user?.userId) return
            try {
              setIsReverseSubmitting(true)
              const res = await reverseApprovalOfActualInvoice({
                invoiceId:
                  pendingReverseInvoice.id ?? pendingReverseInvoice.invoiceNo,
                userId: user.userId,
                isRepRequest: true,
                isAgentRequest: false,
              })
              if (pendingReverseInvoice.invActualBy) {
                await sendReverseRequestNotification({
                  invoice: pendingReverseInvoice,
                  senderUserId: user.userId,
                  recipientUserId: pendingReverseInvoice.invActualBy,
                  recipientSubRoleId: SubRoleId.Agent,
                })
              }
              toast.success(res?.message ?? 'Reverse request sent')
              setPendingReverseInvoice(null)
              refetch()
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to submit reverse request'
              setDetailError(message)
              toast.error(message)
            } finally {
              setIsReverseSubmitting(false)
            }
          }}
        />
        <ConfirmDialog
          open={Boolean(pendingApproveInvoice)}
          onOpenChange={(open) => {
            if (!open) {
              setPendingApproveInvoice(null)
              setAsmRemark('')
            }
          }}
          title={
            approveActor === 'agent'
              ? 'Approve Reverse Request'
              : 'Confirm Reverse Invoice'
          }
          desc={
            pendingApproveInvoice ? (
              <div className='flex flex-wrap items-center gap-1'>
                <span>
                  {approveActor === 'agent'
                    ? 'Approve reverse for invoice'
                    : 'Confirm reverse for invoice'}
                </span>
                <InvoiceNumber
                  invoiceId={
                    pendingApproveInvoice.invoiceNo ??
                    pendingApproveInvoice.id
                  }
                  className='font-semibold text-slate-900 dark:text-slate-50'
                />
                <span>?</span>
              </div>
            ) : (
              ''
            )
          }
          cancelBtnText='Cancel'
          confirmText={
            isApproveSubmitting
              ? approveActor === 'agent'
                ? 'Approving...'
                : 'Reversing...'
              : approveActor === 'agent'
                ? 'Approve'
                : 'Confirm'
          }
          isLoading={isApproveSubmitting}
          disabled={
            approveActor !== 'agent' && !asmRemark.trim().length
          }
          handleConfirm={async () => {
            if (!pendingApproveInvoice || !user?.userId) return
            try {
              setIsApproveSubmitting(true)
              const invoiceId =
                pendingApproveInvoice.id ?? pendingApproveInvoice.invoiceNo
              const res =
                approveActor !== 'agent'
                  ? await approveInvoiceReverseASM(
                      invoiceId,
                      user.userId,
                      asmRemark.trim()
                    )
                  : await reverseApprovalOfActualInvoice({
                      invoiceId,
                      userId: user.userId,
                      isRepRequest: true,
                      isAgentRequest: true,
                    })
              if (pendingApproveInvoice.userId) {
                if (approveActor === 'agent') {
                  await sendReverseApprovalNotification({
                    invoice: pendingApproveInvoice,
                    senderUserId: user.userId,
                    recipientUserId: pendingApproveInvoice.userId,
                    recipientSubRoleId: SubRoleId.Representative,
                    message: 'Agent approved reverse request.',
                  })
                } else {
                  await sendReverseCompletedNotification({
                    invoice: pendingApproveInvoice,
                    senderUserId: user.userId,
                    recipientUserId: pendingApproveInvoice.userId,
                    recipientSubRoleId: SubRoleId.Representative,
                  })
                }
              }
              if (approveActor === 'agent') {
                await sendReverseApprovalNotification({
                  invoice: pendingApproveInvoice,
                  senderUserId: user.userId,
                  recipientSubRoleId: SubRoleId.AreaSalesManager,
                  message: 'Agent approved reverse request.',
                })
                await sendReverseApprovalNotification({
                  invoice: pendingApproveInvoice,
                  senderUserId: user.userId,
                  recipientSubRoleId: SubRoleId.AreaSalesExecutive,
                  message: 'Agent approved reverse request.',
                })
              }
              toast.success(res?.message ?? 'Reverse request approved')
              setPendingApproveInvoice(null)
              setAsmRemark('')
              refetch()
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to approve reverse request'
              setDetailError(message)
              toast.error(message)
            } finally {
              setIsApproveSubmitting(false)
            }
          }}
          className={approveActor === 'agent' ? undefined : 'sm:max-w-md'}
        >
          {approveActor !== 'agent' ? (
            <div className='mt-3'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-200'>
                Reverse reason
              </label>
              <Textarea
                className='mt-2'
                placeholder='Add reverse reason...'
                value={asmRemark}
                onChange={(event) => setAsmRemark(event.target.value)}
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
          onPrintClick={() => {
            setPrintDialogOpen(true)
            refetch()
          }}
          isPrintDisabled={selectedInvoices.length === 0}
        />
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
                    queryClient.invalidateQueries({
                      queryKey: [
                        'actual-invoices',
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
            label: isBuildingPdfs ? 'Building PDF.' : 'Print',
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
                  {isBuildingPdfs ? 'Building.' : 'Refresh Preview'}
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
                  {isBuildingPdfs ? 'Building.' : 'Download'}
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

export default ActualInvoice
