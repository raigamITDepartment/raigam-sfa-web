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
import {
  getAllAgencyDistributors,
  updateActiveStatusAgencyDistributor,
  type AgencyDistributorDTO,
  type ApiResponse,
  type Id,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { CommonDialog } from '@/components/common-dialog'
import { CreateAgencyMappingForm } from './CreateAgencyMappingForm'

type AgencyExportRow = {
  agencyName?: string
  distributorName?: string
  range?: string
  status: string
}

type PendingToggle = {
  id: Id
  agencyName?: string
  nextActive: boolean
}

const exportStatusStyles = `
.status-active { background-color: #d1fae5; color: #065f46; font-weight: 600; }
.status-inactive { background-color: #fee2e2; color: #991b1b; font-weight: 600; }
`

const buildFilterOptions = (
  rows: AgencyDistributorDTO[],
  accessor: (row: AgencyDistributorDTO) => string | number | undefined
) => {
  const values = new Set<string>()

  rows.forEach((agency) => {
    const value = accessor(agency)
    if (value === undefined || value === null) return

    const normalized = String(value).trim()
    if (!normalized) return

    values.add(normalized)
  })

  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }))
}

const resolveAgencyActive = (agency: AgencyDistributorDTO) => {
  const rawStatus = agency.isActive ?? agency.active ?? agency.status
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }
  if (typeof rawStatus === 'boolean') return rawStatus
  return Boolean(rawStatus)
}

export default function AgencyMapping() {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] =
    useState<AgencyDistributorDTO | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['agency-distributor-mappings'],
    queryFn: async () => {
      const res = await getAllAgencyDistributors()
      return res as ApiResponse<AgencyDistributorDTO[]>
    },
  })

  const rows = useMemo(() => {
    const list = data?.payload ?? []
    if (!list.length) return []
    return list
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aId = Number(a.item.id ?? a.item.agencyId ?? 0)
        const bId = Number(b.item.id ?? b.item.agencyId ?? 0)
        if (aId !== bId) return bId - aId
        return b.index - a.index
      })
      .map(({ item }) => item)
  }, [data])
  const distributorFilterOptions = useMemo(
    () => buildFilterOptions(rows, (agency) => agency.distributorName),
    [rows]
  )
  const rangeFilterOptions = useMemo(
    () => buildFilterOptions(rows, (agency) => agency.range ?? agency.rangeName),
    [rows]
  )
  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'Active' },
      { label: 'Inactive', value: 'Inactive' },
    ],
    []
  )

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: PendingToggle) => {
      await updateActiveStatusAgencyDistributor(vars.id)
      return vars
    },
    onSuccess: () => {
      toast.success('Agency status updated')
      queryClient.invalidateQueries({ queryKey: ['agency-distributor-mappings'] })
      setPendingToggle(null)
    },
    onError: (err) => {
      toast.error((err as Error)?.message ?? 'Failed to update agency status')
    },
  })

  const exportRows = useMemo<AgencyExportRow[]>(() => {
    return rows.map((agency) => ({
      agencyName: agency.agencyName,
      distributorName: agency.distributorName,
      range: agency.range ?? agency.rangeName,
      status: resolveAgencyActive(agency) ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns: ExcelExportColumn<AgencyExportRow>[] = useMemo(
    () => [
      { header: 'Agency Name', accessor: 'agencyName' },
      { header: 'Distributor', accessor: 'distributorName' },
      { header: 'Range', accessor: 'range' },
      { header: 'Status', accessor: 'status' },
    ],
    []
  )

  const columns = useMemo<ColumnDef<AgencyDistributorDTO>[]>(
    () => [
      {
        accessorKey: 'agencyName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Agency Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('agencyName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[200px]' },
      },
      {
        accessorKey: 'distributorName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Distributor' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('distributorName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[200px]' },
      },
      {
        accessorFn: (row) => row.range ?? row.rangeName,
        id: 'range',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Range' />
        ),
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return <span className='pl-4'>{value ?? '-'}</span>
        },
        meta: { thClassName: 'w-[140px]' },
      },
      {
        accessorFn: (row) => (resolveAgencyActive(row) ? 'Active' : 'Inactive'),
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
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
          const isActive = resolveAgencyActive(original)

          if (!recordId) return null

          return (
            <div className='flex items-center justify-end gap-2 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit agency mapping'
                    onClick={() => {
                      setEditingMapping(original)
                      setEditDialogOpen(true)
                    }}
                  >
                    <Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Switch
                checked={isActive}
                disabled={toggleStatusMutation.isPending}
                onCheckedChange={(value) => {
                  setPendingToggle({
                    id: recordId,
                    nextActive: value,
                    agencyName: original.agencyName,
                  })
                  setConfirmOpen(true)
                }}
                aria-label={isActive ? 'Deactivate agency' : 'Activate agency'}
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
  const totalCount = rows.length
  const hasGlobalFilter = Boolean(table.getState().globalFilter)
  const activeFiltersCount =
    table.getState().columnFilters.length + (hasGlobalFilter ? 1 : 0)

  const handleConfirmToggle = () => {
    if (!pendingToggle) return
    setConfirmOpen(false)
    toggleStatusMutation.mutate(pendingToggle)
  }

  const editInitialValues = useMemo(() => {
    if (!editingMapping) return undefined
    return {
      rangeId:
        editingMapping.rangeId !== undefined &&
        editingMapping.rangeId !== null
          ? String(editingMapping.rangeId)
          : '',
      distributorId:
        editingMapping.distributorId !== undefined &&
        editingMapping.distributorId !== null
          ? String(editingMapping.distributorId)
          : '',
      agencyIds:
        editingMapping.agencyId !== undefined &&
        editingMapping.agencyId !== null
          ? [String(editingMapping.agencyId)]
          : [],
      isActive: resolveAgencyActive(editingMapping),
    }
  }, [editingMapping])

  return (
    <Card>
      <CardHeader className='space-y-1'>
        <div className='flex items-center gap-2'>
          <CardTitle className='flex w-full items-center gap-3'>
            <span>All Agency Mappings</span>
            <CountBadge value={`${filteredCount}/${totalCount}`} />
            {activeFiltersCount > 0 ? (
              <span className='text-muted-foreground ml-auto text-sm font-medium'>
                Filters {activeFiltersCount}
              </span>
            ) : null}
          </CardTitle>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='agencies'
            worksheetName='Agencies'
            customStyles={exportStatusStyles}
          />
          <Button
            size='sm'
            className='flex items-center gap-1'
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className='size-4 opacity-80' />
            Create Agency Mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search agencies...'
          filters={[
            {
              columnId: 'distributorName',
              title: 'Distributor',
              options: distributorFilterOptions,
            },
            {
              columnId: 'range',
              title: 'Range',
              options: rangeFilterOptions,
            },
            {
              columnId: 'status',
              title: 'Status',
              options: statusFilterOptions,
            },
          ]}
        />
        <div className='rounded-md border'>
          <Table className='text-xs'>
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
                <TableLoadingRows columns={columns.length || 1} />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load agencies'}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='p-1'>
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
                    No agencies found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
      <ConfirmDialog
        destructive
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingToggle(null)
        }}
        title='Change agency status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this agency${
                pendingToggle?.agencyName
                  ? ` "${pendingToggle.agencyName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this agency${
                pendingToggle?.agencyName
                  ? ` "${pendingToggle.agencyName}"`
                  : ''
              }?`
        }
        confirmText={
          pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
        cancelBtnText='No'
        isLoading={toggleStatusMutation.isPending}
        handleConfirm={handleConfirmToggle}
      />
      <CommonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title='Create Agency Mapping'
        description='Create a new agency mapping.'
        hideFooter
      >
        <CreateAgencyMappingForm
          onSubmit={async () => {
            setCreateDialogOpen(false)
          }}
          onCancel={() => setCreateDialogOpen(false)}
        />
      </CommonDialog>
      <CommonDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditingMapping(null)
        }}
        title='Update Agency Mapping'
        description='Update agency mapping details.'
        hideFooter
      >
        <CreateAgencyMappingForm
          mode='edit'
          hideRange
          initialValues={editInitialValues}
          mappingId={
            editingMapping?.id !== undefined && editingMapping?.id !== null
              ? Number(editingMapping.id)
              : undefined
          }
          mappingUserId={
            editingMapping?.userId !== undefined && editingMapping?.userId !== null
              ? Number(editingMapping.userId)
              : undefined
          }
          mappingAgencyCode={editingMapping?.agencyCode ?? null}
          onCancel={() => setEditDialogOpen(false)}
          onSubmit={async () => {
            setEditDialogOpen(false)
          }}
        />
      </CommonDialog>
    </Card>
  )
}
