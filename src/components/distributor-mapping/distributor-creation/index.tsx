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
import { Pencil } from 'lucide-react'
import type { ApiResponse, DistributorDTO, Id } from '@/services/userDemarcationApi'
import {
  deActivateDistributor,
  getAllDistributors,
} from '@/services/userDemarcationApi'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['distributors'],
    queryFn: async () => {
      const res = await getAllDistributors()
      return res as ApiResponse<DistributorDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id }: TogglePayload) => {
      await deActivateDistributor(id)
    },
    onSuccess: () => {
      toast.success('Distributor status updated')
      queryClient.invalidateQueries(['distributors'])
      setPendingToggle(null)
    },
    onError: (err) => {
      toast.error((err as Error)?.message ?? 'Failed to update distributor status')
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

      return {
        distributorName: distributor.distributorName ?? '',
        range: distributor.range ?? '',
        address,
        mobileNo: distributor.mobileNo ?? '',
        email: distributor.email ?? '',
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<DistributorExportRow>[]>(() => {
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
          <span className='pl-4 truncate'>{(getValue() as string) ?? '-'}</span>
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
          <span className='pl-4 truncate'>{row.getValue('email') ?? '-'}</span>
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
                aria-label='View distributor'
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

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle>Distributor List</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar table={table} searchPlaceholder='Search all columns...' />
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
                    No distributors found
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
