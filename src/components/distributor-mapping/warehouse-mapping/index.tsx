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
  deActivateAgencyWarehouse,
  getAllAgencyWarehouse,
  type AgencyWarehouseDTO,
  type ApiResponse,
  type Id,
} from '@/services/userDemarcationApi'
import { Pencil } from 'lucide-react'
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

type WarehouseExportRow = {
  sapAgencyCode?: string
  range?: string
  distributorName?: string
  warehouseName?: string
  status: string
}

type PendingToggle = {
  id: Id
  warehouseName?: string
  sapAgencyCode?: string
  nextActive: boolean
}

const exportStatusStyles = `
.status-active { background-color: #d1fae5; color: #065f46; font-weight: 600; }
.status-inactive { background-color: #fee2e2; color: #991b1b; font-weight: 600; }
`

const buildFilterOptions = (
  rows: AgencyWarehouseDTO[],
  accessor: (row: AgencyWarehouseDTO) => string | number | undefined
) => {
  const values = new Set<string>()

  rows.forEach((row) => {
    const value = accessor(row)
    if (value === undefined || value === null) return

    const normalized = String(value).trim()
    if (!normalized) return

    values.add(normalized)
  })

  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }))
}

export default function WareHouseMapping() {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['agencyWarehouses'],
    queryFn: async () => {
      const res = await getAllAgencyWarehouse()
      return res as ApiResponse<AgencyWarehouseDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const rangeFilterOptions = useMemo(
    () => buildFilterOptions(rows, (mapping) => mapping.range),
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
      await deActivateAgencyWarehouse(vars.id)
      return vars
    },
    onSuccess: () => {
      toast.success('Warehouse status updated')
      queryClient.invalidateQueries({ queryKey: ['agencyWarehouses'] })
      setPendingToggle(null)
    },
    onError: (err) => {
      toast.error(
        (err as Error)?.message ?? 'Failed to update warehouse status'
      )
    },
  })

  const exportRows = useMemo<WarehouseExportRow[]>(() => {
    return rows.map((mapping) => ({
      sapAgencyCode: mapping.sapAgencyCode,
      range: mapping.range,
      distributorName: mapping.distributorName,
      warehouseName: mapping.warehouseName,
      status: mapping.isActive ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns: ExcelExportColumn<WarehouseExportRow>[] = useMemo(
    () => [
      { header: 'Warehouse Name', accessor: 'warehouseName' },
      { header: 'SAP Agency Code', accessor: 'sapAgencyCode' },
      { header: 'Range', accessor: 'range' },
      { header: 'Distributor', accessor: 'distributorName' },
      { header: 'Status', accessor: 'status' },
    ],
    []
  )

  const columns = useMemo<ColumnDef<AgencyWarehouseDTO>[]>(
    () => [
      {
        accessorKey: 'warehouseName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Warehouse Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('warehouseName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[220px]' },
      },
      {
        accessorKey: 'sapAgencyCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='SAP Agency Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('sapAgencyCode') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[200px]' },
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
        accessorKey: 'distributorName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Distributor' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('distributorName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[220px]' },
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
                    aria-label='Edit warehouse mapping'
                    onClick={() => toast('Edit warehouse mapping coming soon')}
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
                    warehouseName: original.warehouseName,
                    sapAgencyCode: original.sapAgencyCode,
                  })
                  setConfirmOpen(true)
                }}
                aria-label={
                  isActive
                    ? 'Deactivate warehouse mapping'
                    : 'Activate warehouse mapping'
                }
              />
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-[120px]' },
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
            <span>Warehouse Mappings</span>
            <CountBadge value={`${filteredCount}/${totalCount}`} />
            <span className='text-muted-foreground ml-auto text-sm font-medium'>
              Filters {activeFiltersCount}
            </span>
          </CardTitle>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='agency-warehouses'
            worksheetName='Agency Warehouses'
            customStyles={exportStatusStyles}
          />
        </div>
        <p className='text-muted-foreground text-sm'>
          Showing {filteredCount} of {totalCount} warehouses
        </p>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search warehouse mappings...'
        filters={[
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
                    Loading warehouse mappings...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ??
                      'Failed to load warehouse mappings'}
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
                    No warehouse mappings found
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
        title='Change warehouse status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this warehouse mapping for SAP Agency code${
                pendingToggle?.sapAgencyCode
                  ? ` "${pendingToggle.sapAgencyCode}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this warehouse mapping for SAP Agency code${
                pendingToggle?.sapAgencyCode
                  ? ` "${pendingToggle.sapAgencyCode}"`
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
    </Card>
  )
}
