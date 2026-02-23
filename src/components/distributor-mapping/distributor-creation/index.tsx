import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  ApiResponse,
  DistributorDTO,
  Id,
  RangeDTO,
} from '@/services/userDemarcationApi'
import {
  deActivateDistributor,
  getAllDistributors,
  getAllRange,
} from '@/services/userDemarcationApi'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommonDialog } from '@/components/common-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { CreateDistributorForm } from './create-distributor-form'
import { UpdateDistributorForm } from './update-distributor-form'

type DistributorExportRow = {
  distributorName: string
  range: string
  address: string
  mobileNo: string
  email: string
  status: string
}

const formatAddress = (...parts: (string | undefined | null)[]) => {
  return (
    parts
      .map((part) => part?.trim().replace(/,+$/, ''))
      .filter(Boolean)
      .join(', ') || '-'
  )
}

const buildFacetOptions = (values: (string | undefined | null)[]) => {
  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value !== '')

  return Array.from(new Set(normalized)).map((value) => ({
    label: value,
    value,
  }))
}

const normalizeId = (value: Id | undefined | null) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

type TogglePayload = {
  id: Id
  nextActive: boolean
  record: DistributorDTO
}

export default function DistributorCreation() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<TogglePayload | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'update'>('create')
  const [activeDistributor, setActiveDistributor] =
    useState<DistributorDTO | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['distributors'],
    queryFn: async () => {
      const res = await getAllDistributors()
      return res as ApiResponse<DistributorDTO[]>
    },
  })

  const rangesQuery = useQuery({
    queryKey: ['user-demarcation', 'ranges'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
  })

  const ranges = rangesQuery.data ?? []

  const rangeLookup = useMemo(() => {
    const lookup = new Map<string, Id>()
    ranges.forEach((range) => {
      const optionId = range.id ?? range.rangeId
      if (optionId === undefined || optionId === null) return

      const normalizedRangeName = range.rangeName?.trim().toLowerCase()
      if (normalizedRangeName) {
        lookup.set(normalizedRangeName, optionId)
      }

      const normalizedOptionId = String(optionId).trim().toLowerCase()
      if (normalizedOptionId) {
        lookup.set(normalizedOptionId, optionId)
      }
    })
    return lookup
  }, [ranges])

  const rows = useMemo(() => {
    if (!data?.payload) return []
    const mapped = data.payload.map((record) => {
      const displayRange = record.range ?? record.rangeName ?? ''
      const normalizedRange = displayRange.trim().toLowerCase()
      const resolvedRangeId =
        record.rangeId ??
        (normalizedRange ? rangeLookup.get(normalizedRange) : undefined)

      return {
        ...record,
        range: displayRange,
        rangeName: record.rangeName ?? displayRange,
        rangeId: resolvedRangeId ?? record.rangeId,
      }
    })

    return mapped
      .slice()
      .sort((a, b) => normalizeId(b.id) - normalizeId(a.id))
  }, [data, rangeLookup])

  const rangeFilterOptions = useMemo(
    () =>
      buildFacetOptions([
        ...rows.map((row) => row.range),
        ...ranges.map((range) => range.rangeName),
      ]),
    [rows, ranges]
  )

  const formInitialValues = useMemo(() => {
    if (!activeDistributor) return undefined
    const rangeLabel = (
      activeDistributor.range ??
      activeDistributor.rangeName ??
      ''
    ).trim()
    const normalizedLabel = rangeLabel.toLowerCase()
    const resolvedRangeId =
      activeDistributor.rangeId ??
      (normalizedLabel ? rangeLookup.get(normalizedLabel) : undefined)

    return {
      rangeId: resolvedRangeId !== undefined ? String(resolvedRangeId) : '',
      rangeName: rangeLabel,
      range: rangeLabel,
      distributorName: activeDistributor.distributorName ?? '',
      email: activeDistributor.email ?? '',
      address1: activeDistributor.address1 ?? '',
      address2: activeDistributor.address2 ?? '',
      address3: activeDistributor.address3 ?? '',
      mobileNo: activeDistributor.mobileNo ?? '',
      vatNum: activeDistributor.vatNum ?? '',
      isActive: activeDistributor.isActive ?? true,
    }
  }, [activeDistributor, rangeLookup])

  const openCreateModal = () => {
    setModalMode('create')
    setActiveDistributor(null)
    setIsDialogOpen(true)
  }

  const openEditModal = (distributor: DistributorDTO) => {
    setModalMode('update')
    setActiveDistributor(distributor)
    setIsDialogOpen(true)
  }

  const handleDialogToggle = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setActiveDistributor(null)
    }
  }

  const closeDialog = () => handleDialogToggle(false)

  const dialogTitle =
    modalMode === 'create' ? 'Create Distributor' : 'Update Distributor'
  const dialogDescription =
    modalMode === 'create'
      ? 'Add a new distributor to the selected range.'
      : 'Update the existing distributor details.'

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id }: TogglePayload) => {
      await deActivateDistributor(id)
    },
    onSuccess: () => {
      toast.success('Distributor status updated')
      queryClient.invalidateQueries({ queryKey: ['distributors'] })
      setPendingToggle(null)
    },
    onError: (err) => {
      toast.error(
        (err as Error)?.message ?? 'Failed to update distributor status'
      )
    },
  })

  const exportRows = useMemo<DistributorExportRow[]>(() => {
    return rows.map((distributor) => {
      const address = formatAddress(
        distributor.address1,
        distributor.address2,
        distributor.address3
      )
      const statusLabel = distributor.isActive ? 'Active' : 'Inactive'

      const rangeValue = distributor.range ?? distributor.rangeName ?? ''
      return {
        distributorName: distributor.distributorName ?? '',
        range: rangeValue,
        address,
        mobileNo: distributor.mobileNo ?? '',
        email: distributor.email ?? '',
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<
    ExcelExportColumn<DistributorExportRow>[]
  >(() => {
    return [
      { header: 'Distributor Name', accessor: 'distributorName' },
      { header: 'Range', accessor: 'range' },
      { header: 'Address', accessor: 'address' },
      { header: 'Mobile', accessor: 'mobileNo' },
      { header: 'Email', accessor: 'email' },
      {
        header: 'Status',
        accessor: 'status',
        cellClassName: (value) => {
          const normalized = String(value ?? '').toLowerCase()
          if (normalized === 'active') return 'status-active'
          if (!normalized) return undefined
          return 'status-inactive'
        },
      },
    ]
  }, [])

  const exportStatusStyles = `
.status-active { background-color: #d1fae5; color: #065f46; font-weight: 600; }
.status-inactive { background-color: #fee2e2; color: #991b1b; font-weight: 600; }
`

  const filters = useMemo(
    () => [
      {
        columnId: 'range',
        title: 'Range',
        options: rangeFilterOptions,
      },
    ],
    [rangeFilterOptions]
  )

  const columns = useMemo<ColumnDef<DistributorDTO>[]>(
    () => [
      {
        accessorKey: 'distributorName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Distributor name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('distributorName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[220px]' },
      },
      {
        accessorKey: 'range',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Range' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('range') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[140px]' },
      },
      {
        id: 'address',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Address' />
        ),
        accessorFn: (row) =>
          formatAddress(row.address1, row.address2, row.address3),
        cell: ({ getValue }) => (
          <span className='truncate pl-4'>{(getValue() as string) ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'mobileNo',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Mobile' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('mobileNo') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[160px]' },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Email' />
        ),
        cell: ({ row }) => (
          <span className='truncate pl-4'>{row.getValue('email') ?? '-'}</span>
        ),
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        accessorFn: (row) => (row.isActive ? 'Active' : 'Inactive'),
        cell: ({ getValue }) => {
          const value = String(getValue() ?? '')
          const normalized = value.toLowerCase()
          const isActive = normalized === 'active'
          const variant = isActive ? 'secondary' : 'destructive'
          return (
            <Badge
              variant={variant as any}
              className={
                isActive
                  ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
                  : undefined
              }
            >
              {value}
            </Badge>
          )
        },
        meta: { thClassName: 'w-[120px]' },
      },
      {
        id: 'actions',
        header: () => <div className='pr-4 text-end'>Actions</div>,
        cell: ({ row }) => {
          const original = row.original
          const recordId =
            (original.id as Id | undefined) ?? (row.id as Id | undefined)
          const isActive = Boolean(original.isActive)
          const label = isActive
            ? 'Deactivate distributor'
            : 'Activate distributor'

          if (!recordId) return null

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Edit distributor'
                onClick={() => openEditModal(original)}
              >
                <Pencil className='size-4' />
              </Button>
              <Switch
                checked={isActive}
                disabled={toggleStatusMutation.isPending}
                onCheckedChange={(value) => {
                  setPendingToggle({
                    id: recordId,
                    nextActive: value,
                    record: original,
                  })
                  setConfirmOpen(true)
                }}
                aria-label={label}
              />
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-[110px]' },
      },
    ],
    [toggleStatusMutation.isPending]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <CardTitle>All Distributors</CardTitle>
          <CountBadge value={`${filteredCount}/${rows.length}`} />
        </div>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='distributors'
            worksheetName='Distributors'
            customStyles={exportStatusStyles}
          />
          <Button
            size='sm'
            variant='default'
            className='flex items-center gap-1'
            onClick={openCreateModal}
          >
            <Plus className='size-4 opacity-80' />
            Create Distributor
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={filters}
        />
        <div className='rounded-md border'>
          <Table className='text-xs whitespace-nowrap'>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        'h-10 bg-gray-100 px-2 dark:bg-gray-900 ' +
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-20 text-center'
                  >
                    Loading distributors...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load distributors'}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='p-1 whitespace-nowrap'>
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
                    No distributors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={isDialogOpen}
        onOpenChange={handleDialogToggle}
        title={dialogTitle}
        description={dialogDescription}
        hideFooter
        contentClassName='max-w-3xl'
      >
        {modalMode === 'create' ? (
          <CreateDistributorForm
            key='create-distributor-form'
            initialValues={formInitialValues}
            onCancel={closeDialog}
            onSuccess={closeDialog}
            ranges={ranges}
          />
        ) : (
          <UpdateDistributorForm
            key={`update-distributor-form-${activeDistributor?.id ?? 'unknown'}`}
            distributorId={activeDistributor?.id}
            initialValues={formInitialValues}
            onCancel={closeDialog}
            onSuccess={closeDialog}
            ranges={ranges}
          />
        )}
      </CommonDialog>
      <ConfirmDialog
        destructive
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingToggle(null)
        }}
        title='Change distributor status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate ${
                pendingToggle?.record.distributorName ?? 'this distributor'
              }?`
            : `Are you sure you want to deactivate ${
                pendingToggle?.record.distributorName ?? 'this distributor'
              }?`
        }
        confirmText={
          pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
        cancelBtnText='No'
        isLoading={toggleStatusMutation.isPending}
        handleConfirm={() => {
          if (!pendingToggle) return
          toggleStatusMutation.mutate(pendingToggle)
          setConfirmOpen(false)
          setPendingToggle(null)
        }}
      />
    </Card>
  )
}
