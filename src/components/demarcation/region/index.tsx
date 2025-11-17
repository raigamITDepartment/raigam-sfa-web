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
  deactivateRegion,
  getAllRegion,
  type ApiResponse,
  type RegionDTO,
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
import { RegionForm, type RegionFormValues } from './region-form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type RegionExportRow = {
  regionCode?: string
  regionName: string
  channelName?: string
  subChannelName?: string
  status: string
}

export default function Region() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await getAllRegion()
      return res as ApiResponse<RegionDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const exportRows = useMemo<RegionExportRow[]>(() => {
    return rows.map((region) => {
      const rawStatus =
        (region.status as string | boolean | undefined) ??
        (region.isActive as boolean | undefined) ??
        (region.active as boolean | undefined)
      const statusLabel =
        typeof rawStatus === 'string'
          ? rawStatus
          : rawStatus
            ? 'Active'
            : 'Inactive'

      return {
        regionCode: region.regionCode,
        regionName: region.regionName ?? region.name ?? '',
        channelName: region.channelName,
        subChannelName: region.subChannelName,
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<RegionExportRow>[]>(() => {
    return [
      { header: 'Region Code', accessor: 'regionCode' },
      { header: 'Region Name', accessor: 'regionName' },
      { header: 'Channel', accessor: 'channelName' },
      { header: 'Sub Channel', accessor: 'subChannelName' },
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
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [regionDialogMode, setRegionDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingRegionId, setEditingRegionId] = useState<Id | null>(null)
  const [regionInitialValues, setRegionInitialValues] = useState<
    Partial<RegionFormValues> | undefined
  >(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    regionName: string
    nextActive: boolean
  } | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await deactivateRegion(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<RegionDTO[]>>(
        ['regions'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((region) => {
            const regionId = region.id
            if (String(regionId) !== String(id)) return region
            const payload = response?.payload

            if (payload) {
              const resolvedActive =
                (payload.isActive as boolean | undefined) ??
                (payload.active as boolean | undefined) ??
                nextActive
              const resolvedStatus =
                payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
              return {
                ...region,
                ...payload,
                isActive: resolvedActive,
                active: resolvedActive,
                status: resolvedStatus,
              }
            }
            return {
              ...region,
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
            ? 'Region activated successfully'
            : 'Region deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update region status'
      toast.error(message)
    },
  })

  const columns = useMemo<ColumnDef<RegionDTO>[]>(
    () => [
      {
        accessorKey: 'regionCode',
        accessorFn: (row) => row.regionCode ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Region Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('regionCode') ?? '—'}</span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorKey: 'regionName',
        accessorFn: (row) => row.regionName ?? row.name ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Region Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('regionName')}</span>
        ),
      },
      {
        accessorKey: 'channelName',
        accessorFn: (row) => row.channelName ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('channelName') ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'subChannelName',
        accessorFn: (row) => row.subChannelName ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Channel' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>
            {row.getValue('subChannelName') ?? '—'}
          </span>
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
                    aria-label='Edit region'
                    onClick={() => {
                      setRegionDialogMode('edit')
                      setEditingRegionId(recordId ?? null)
                      setRegionInitialValues({
                        channelId: original.channelId
                          ? String(original.channelId)
                          : '',
                        subChannelId: original.subChannelId
                          ? String(original.subChannelId)
                          : '',
                        regionCode:
                          (original.regionCode as string | undefined) ?? '',
                        regionName:
                          (original.regionName as string | undefined) ??
                          (original.name as string | undefined) ??
                          '',
                        isActive: baseActive,
                      })
                      setRegionDialogOpen(true)
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
                      regionName:
                        (original.regionName as string | undefined) ??
                        (original.name as string | undefined) ??
                        (row.getValue('regionName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    baseActive ? 'Deactivate region' : 'Activate region'
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
        <CardTitle>Region List</CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='regions'
            worksheetName='Regions'
            customStyles={exportStatusStyles}
            disabled={!rows.length}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setRegionDialogMode('create')
              setEditingRegionId(null)
              setRegionInitialValues(undefined)
              setRegionDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Region
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
                    Loading regions...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load regions'}
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
                    No regions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={regionDialogOpen}
        onOpenChange={(open) => {
          setRegionDialogOpen(open)
          if (!open) {
            setRegionDialogMode('create')
            setEditingRegionId(null)
            setRegionInitialValues(undefined)
          }
        }}
        title={
          regionDialogMode === 'create' ? 'Create Region' : 'Update Region'
        }
        description={
          regionDialogMode === 'create'
            ? 'Create a new region.'
            : 'Update region details.'
        }
        hideFooter
      >
        <RegionForm
          mode={regionDialogMode}
          regionId={editingRegionId ?? undefined}
          initialValues={regionInitialValues}
          onSubmit={async () => {
            setRegionDialogOpen(false)
            setRegionDialogMode('create')
            setEditingRegionId(null)
            setRegionInitialValues(undefined)
          }}
          onCancel={() => {
            setRegionDialogOpen(false)
            setRegionDialogMode('create')
            setEditingRegionId(null)
            setRegionInitialValues(undefined)
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
        title='Change region status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this region${
                pendingToggle?.regionName
                  ? ` "${pendingToggle.regionName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this region${
                pendingToggle?.regionName
                  ? ` "${pendingToggle.regionName}"`
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
