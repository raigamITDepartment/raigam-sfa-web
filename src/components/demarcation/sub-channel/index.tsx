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
  deactivateSubChannel,
  getAllSubChannel,
  type ApiResponse,
  type SubChannelDTO,
  type Id,
} from '@/services/userDemarcationApi'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExcelExportButton, type ExcelExportColumn } from '@/components/excel-export-button'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { CommonDialog } from '@/components/common-dialog'
import { Plus, Pencil } from 'lucide-react'
import { SubChannelForm, type SubChannelFormValues } from './sub-channel-form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type SubChannelExportRow = {
  subChannelCode?: string
  subChannelName: string
  channelName?: string
  status: string
}

export default function SubChannel() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sub-channels'],
    queryFn: async () => {
      const res = await getAllSubChannel()
      return res as ApiResponse<SubChannelDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const exportRows = useMemo<SubChannelExportRow[]>(() => {
    return rows.map((subChannel) => {
      const rawStatus =
        (subChannel.status as string | boolean | undefined) ??
        (subChannel.isActive as boolean | undefined) ??
        (subChannel.active as boolean | undefined)
      const statusLabel =
        typeof rawStatus === 'string'
          ? rawStatus
          : rawStatus
            ? 'Active'
            : 'Inactive'
      return {
        subChannelCode: subChannel.subChannelCode,
        subChannelName: subChannel.subChannelName,
        channelName: subChannel.channelName,
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<SubChannelExportRow>[]>(() => {
    return [
      { header: 'Sub Channel Code', accessor: 'subChannelCode' },
      { header: 'Sub Channel Name', accessor: 'subChannelName' },
      { header: 'Channel Name', accessor: 'channelName' },
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

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [subChannelDialogOpen, setSubChannelDialogOpen] = useState(false)
  const [subChannelDialogMode, setSubChannelDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingSubChannelId, setEditingSubChannelId] = useState<Id | null>(null)
  const [subChannelInitialValues, setSubChannelInitialValues] = useState<
    Partial<SubChannelFormValues> | undefined
  >(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    subChannelName: string
    nextActive: boolean
  } | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await deactivateSubChannel(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<SubChannelDTO[]>>(
        ['sub-channels'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((subChannel) => {
            const subChannelId = subChannel.id
            if (String(subChannelId) !== String(id)) return subChannel

            const payload = response?.payload
            if (payload) {
              const resolvedActive =
                (payload.isActive as boolean | undefined) ??
                (payload.active as boolean | undefined) ??
                nextActive
              const resolvedStatus =
                payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
              return {
                ...subChannel,
                ...payload,
                isActive: resolvedActive,
                active: resolvedActive,
                status: resolvedStatus,
              }
            }

            return {
              ...subChannel,
              isActive: nextActive,
              active: nextActive,
              status: nextActive ? 'Active' : 'Inactive',
            }
          })

          return { ...old, payload: updatedPayload }
        }
      )
      toast.success(
        response?.message ??
          (nextActive
            ? 'Sub channel activated successfully'
            : 'Sub channel deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update sub channel status'
      toast.error(message)
    },
  })

  const columns = useMemo<ColumnDef<SubChannelDTO>[]>(
    () => [
      {
        accessorKey: 'subChannelCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Channel Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {row.getValue('subChannelCode') ?? '—'}
          </span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorKey: 'subChannelName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Channel Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>
            {row.getValue('subChannelName')}
          </span>
        ),
      },
      {
        accessorKey: 'channelName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('channelName') ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as UnknownRecord
          const raw =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined)
          const baseActive =
            typeof raw === 'string'
              ? raw.toLowerCase() === 'active'
              : Boolean(raw)

          const label = baseActive ? 'Active' : 'Inactive'
          const variant = baseActive ? 'secondary' : 'destructive'

          return (
            <Badge
              variant={variant as any}
              className={
                baseActive
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
          const original = row.original as UnknownRecord
          const rawStatus =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined)

          const recordId = original.id as Id | undefined
          const baseActive =
            typeof rawStatus === 'string'
              ? rawStatus.toLowerCase() === 'active'
              : Boolean(rawStatus)

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit sub channel'
                    onClick={() => {
                      setSubChannelDialogMode('edit')
                      setEditingSubChannelId(recordId ?? null)
                      setSubChannelInitialValues({
                        channelId: original.channelId
                          ? String(original.channelId)
                          : '',
                        subChannelCode:
                          (original.subChannelCode as string | undefined) ?? '',
                        subChannelName:
                          (original.subChannelName as string | undefined) ?? '',
                        isActive: baseActive,
                      })
                      setSubChannelDialogOpen(true)
                    }}
                  >
                    <Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <div className='flex items-center gap-1'>
                <Switch
                  checked={baseActive}
                  onCheckedChange={(value) => {
                    if (recordId == null) return
                    setPendingToggle({
                      id: recordId,
                      subChannelName:
                        (original.subChannelName as string | undefined) ??
                        (row.getValue('subChannelName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    baseActive
                      ? 'Deactivate sub channel'
                      : 'Activate sub channel'
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
    []
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
        <CardTitle>Sub Channel List</CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='sub-channels'
            worksheetName='Sub Channels'
            customStyles={exportStatusStyles}
            disabled={!rows.length}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setSubChannelDialogMode('create')
              setEditingSubChannelId(null)
              setSubChannelInitialValues(undefined)
              setSubChannelDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Sub Channel
          </Button>
        </div>
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
                    Loading sub channels...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load sub channels'}
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
                    No sub channels found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={subChannelDialogOpen}
        onOpenChange={(open) => {
          setSubChannelDialogOpen(open)
          if (!open) {
            setSubChannelDialogMode('create')
            setEditingSubChannelId(null)
            setSubChannelInitialValues(undefined)
          }
        }}
        title={
          subChannelDialogMode === 'create'
            ? 'Create Sub Channel'
            : 'Update Sub Channel'
        }
        description={
          subChannelDialogMode === 'create'
            ? 'Create a new sub channel.'
            : 'Update sub channel details.'
        }
        hideFooter
      >
        <SubChannelForm
          mode={subChannelDialogMode}
          subChannelId={editingSubChannelId ?? undefined}
          initialValues={subChannelInitialValues}
          onSubmit={async () => {
            setSubChannelDialogOpen(false)
            setSubChannelDialogMode('create')
            setEditingSubChannelId(null)
            setSubChannelInitialValues(undefined)
          }}
          onCancel={() => {
            setSubChannelDialogOpen(false)
            setSubChannelDialogMode('create')
            setEditingSubChannelId(null)
            setSubChannelInitialValues(undefined)
          }}
        />
      </CommonDialog>
      <ConfirmDialog
        destructive
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingToggle(null)
        }}
        title='Change sub channel status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this sub channel${
                pendingToggle?.subChannelName
                  ? ` "${pendingToggle.subChannelName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this sub channel${
                pendingToggle?.subChannelName
                  ? ` "${pendingToggle.subChannelName}"`
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
            id: pendingToggle.id,
            nextActive: pendingToggle.nextActive,
          })
          setConfirmOpen(false)
          setPendingToggle(null)
        }}
      />
    </Card>
  )
}

type UnknownRecord = Record<string, unknown>
