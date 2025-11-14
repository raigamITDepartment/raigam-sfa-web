import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  type ApiResponse,
  type ChannelDTO,
  type Id,
  getAllChannel,
  toggleChannelActive,
} from '@/services/userDemarcationApi'
import { Pencil } from 'lucide-react'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import type { NavigateFn as TableNavigateFn } from '@/hooks/use-table-url-state'
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

export default function Channel() {
  const navigate = useNavigate()
  const router = useRouter()
  const search = router.state.location.search as Record<string, unknown>

  const tableNavigate: TableNavigateFn = (opts) =>
    navigate({
      search: opts.search as any,
      replace: opts.replace,
    })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await getAllChannel()
      return res as ApiResponse<ChannelDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, boolean>
  >({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    key: string
    channelName: string
    nextActive: boolean
  } | null>(null)

  const {
    globalFilter,
    onGlobalFilterChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate: tableNavigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'filter', trim: true },
  })

  const [sorting, setSorting] = useState<SortingState>([])

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      await toggleChannelActive(vars.id)
      return vars
    },
    onSuccess: ({ id, nextActive }) => {
      setStatusOverrides((prev) => ({
        ...prev,
        [String(id)]: nextActive,
      }))
    },
  })

  const columns = useMemo<ColumnDef<ChannelDTO>[]>(
    () => [
      {
        accessorKey: 'channelCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('channelCode')}</span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorKey: 'channelName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('channelName')}</span>
        ),
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as unknown as Record<string, unknown>
          const raw =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined) ??
            (original.enabled as boolean | undefined)

          const idKey = String(
            (original.id as Id | undefined) ??
              (original.channelCode as string | undefined) ??
              row.id
          )

          const baseActive =
            typeof raw === 'string'
              ? raw.toLowerCase() === 'active'
              : Boolean(raw)
          const isActive = statusOverrides[idKey] ?? baseActive

          const label = isActive ? 'Active' : 'Inactive'
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
              {label}
            </Badge>
          )
        },
        meta: { thClassName: 'w-[120px]' },
      },
      {
        id: 'actions',
        header: () => <div className='pr-4 text-end'>Actions</div>,
        cell: ({ row }) => {
          const original = row.original as unknown as Record<string, unknown>
          const rawStatus =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined) ??
            (original.enabled as boolean | undefined)

          const idKey = String(
            (original.id as Id | undefined) ??
              (original.channelCode as string | undefined) ??
              row.id
          )

          const baseActive =
            typeof rawStatus === 'string'
              ? rawStatus.toLowerCase() === 'active'
              : Boolean(rawStatus)
          const isActive = statusOverrides[idKey] ?? baseActive

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit channel'
                  >
                    <Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <div className='flex items-center gap-1'>
                <Switch
                  checked={isActive}
                  onCheckedChange={(value) => {
                    setPendingToggle({
                      key: idKey,
                      channelName:
                        (original.channelName as string | undefined) ??
                        (row.getValue('channelName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    isActive ? 'Deactivate channel' : 'Activate channel'
                  }
                />
              </div>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-[120px]' },
      },
    ],
    [statusOverrides]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [rows.length, table, ensurePageInRange])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel List</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
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
                    Loading channels...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load channels'}
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
                    No channels found
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
        title='Change channel status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this channel${
                pendingToggle?.channelName
                  ? ` "${pendingToggle.channelName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this channel${
                pendingToggle?.channelName
                  ? ` "${pendingToggle.channelName}"`
                  : ''
              }?`
        }
        confirmText={
          pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
        cancelBtnText='No'
        isLoading={toggleStatusMutation.isPending}
        handleConfirm={() => {
          if (!pendingToggle) return
          toggleStatusMutation.mutate({
            id: pendingToggle.key,
            nextActive: pendingToggle.nextActive,
          })
          setConfirmOpen(false)
          setPendingToggle(null)
        }}
      />
    </Card>
  )
}
