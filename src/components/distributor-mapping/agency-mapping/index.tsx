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
  getAllAgency,
  toggleAgencyActive,
  type AgencyDTO,
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
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { CommonDialog } from '@/components/common-dialog'
import { AgencyForm } from '@/components/demarcation/agency/agency-form'

type AgencyExportRow = {
  agencyCode?: number | string
  agencyName?: string
  channelName?: string
  territoryName?: string
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
  rows: AgencyDTO[],
  accessor: (row: AgencyDTO) => string | number | undefined
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

export default function AgencyMapping() {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const res = await getAllAgency()
      return res as ApiResponse<AgencyDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const channelFilterOptions = useMemo(
    () => buildFilterOptions(rows, (agency) => agency.channelName),
    [rows]
  )
  const territoryFilterOptions = useMemo(
    () => buildFilterOptions(rows, (agency) => agency.territoryName),
    [rows]
  )
  const rangeFilterOptions = useMemo(
    () => buildFilterOptions(rows, (agency) => agency.range),
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
      await toggleAgencyActive(vars.id)
      return vars
    },
    onSuccess: () => {
      toast.success('Agency status updated')
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
      setPendingToggle(null)
    },
    onError: (err) => {
      toast.error((err as Error)?.message ?? 'Failed to update agency status')
    },
  })

  const exportRows = useMemo<AgencyExportRow[]>(() => {
    return rows.map((agency) => ({
      agencyCode: agency.agencyCode,
      agencyName: agency.agencyName,
      channelName: agency.channelName,
      territoryName: agency.territoryName,
      range: agency.range,
      status: agency.isActive ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns: ExcelExportColumn<AgencyExportRow>[] = useMemo(
    () => [
      { header: 'Agency Code', accessor: 'agencyCode' },
      { header: 'Agency Name', accessor: 'agencyName' },
      { header: 'Channel', accessor: 'channelName' },
      { header: 'Territory', accessor: 'territoryName' },
      { header: 'Range', accessor: 'range' },
      { header: 'Status', accessor: 'status' },
    ],
    []
  )

  const columns = useMemo<ColumnDef<AgencyDTO>[]>(
    () => [
      {
        accessorKey: 'agencyCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Agency Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('agencyCode') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[120px]' },
      },
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
        accessorKey: 'channelName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('channelName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[150px]' },
      },
      {
        accessorKey: 'territoryName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('territoryName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorFn: (row) => row.range,
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
        accessorFn: (row) => (row.isActive ? 'Active' : 'Inactive'),
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
          const isActive = Boolean(original.isActive)

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
                    onClick={() => toast('Edit agency mapping coming soon')}
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
              columnId: 'channelName',
              title: 'Channel',
              options: channelFilterOptions,
            },
            {
              columnId: 'territoryName',
              title: 'Territory',
              options: territoryFilterOptions,
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
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-20 text-center'
                  >
                    Loading agencies...
                  </TableCell>
                </TableRow>
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
        <AgencyForm
          mode='create'
          onSubmit={async () => {
            setCreateDialogOpen(false)
          }}
          onCancel={() => {
            setCreateDialogOpen(false)
          }}
        />
      </CommonDialog>
    </Card>
  )
}
