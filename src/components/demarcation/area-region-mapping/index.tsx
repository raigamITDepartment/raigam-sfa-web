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
  deactivateAreaRegion,
  getAllAreaRegions,
  getAllChannel,
  type ApiResponse,
  type AreaRegionDTO,
  type ChannelDTO,
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
import { AreaRegionForm, type AreaRegionFormValues } from './area-region-form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type MappingExportRow = {
  areaName?: string
  regionName?: string
  status: string
}

export default function AreaRegionMapping() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['area-region-mappings'],
    queryFn: async () => {
      const res = await getAllAreaRegions()
      return res as ApiResponse<AreaRegionDTO[]>
    },
  })

  const { data: channelsData } = useQuery({
    queryKey: ['channels', 'options'],
    queryFn: async () => {
      const res = await getAllChannel()
      return (res as ApiResponse<ChannelDTO[]>).payload
    },
    initialData: () => {
      const existing = queryClient.getQueryData<ApiResponse<ChannelDTO[]>>([
        'channels',
      ])
      return existing?.payload
    },
  })

  const rows = useMemo(() => {
    const payload = data?.payload ?? []
    return [...payload].sort((a, b) => {
      const aId = Number(a.id)
      const bId = Number(b.id)
      if (Number.isNaN(aId) || Number.isNaN(bId)) return 0
      return bId - aId
    })
  }, [data])

  const exportRows = useMemo<MappingExportRow[]>(() => {
    return rows.map((mapping) => {
      const rawStatus =
        (mapping.status as string | boolean | undefined) ??
        (mapping.isActive as boolean | undefined) ??
        (mapping.active as boolean | undefined)
      const statusLabel =
        typeof rawStatus === 'string'
          ? rawStatus
          : rawStatus
            ? 'Active'
            : 'Inactive'
      return {
        areaName: mapping.areaName,
        regionName: mapping.regionName,
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<MappingExportRow>[]>(() => {
    return [
      { header: 'Area Name', accessor: 'areaName' },
      { header: 'Region Name', accessor: 'regionName' },
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<Id | null>(null)
  const [initialValues, setInitialValues] = useState<
    Partial<AreaRegionFormValues> | undefined
  >(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    areaName: string
    nextActive: boolean
  } | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await deactivateAreaRegion(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<AreaRegionDTO[]>>(
        ['area-region-mappings'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((mapping) => {
            if (String(mapping.id) !== String(id)) return mapping
            const payload = response?.payload
            if (payload) {
              const resolvedActive =
                (payload.isActive as boolean | undefined) ??
                (payload.active as boolean | undefined) ??
                nextActive
              const resolvedStatus =
                payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
              return {
                ...mapping,
                ...payload,
                isActive: resolvedActive,
                active: resolvedActive,
                status: resolvedStatus,
              }
            }
            return {
              ...mapping,
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
            ? 'Mapping activated successfully'
            : 'Mapping deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update mapping status'
      toast.error(message)
    },
  })

  const columns = useMemo<ColumnDef<AreaRegionDTO>[]>(
    () => [
      {
        accessorKey: 'regionName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Region' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('regionName')}</span>
        ),
      },
      {
        accessorKey: 'areaName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Area Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('areaName')}</span>
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
                    aria-label='Edit mapping'
                    onClick={() => {
                      setDialogMode('edit')
                      setEditingId(recordId ?? null)
                      setInitialValues({
                        areaId: original.areaId
                          ? String(original.areaId)
                          : '',
                        regionIds: original.regionId
                          ? [String(original.regionId)]
                          : [],
                        isActive: baseActive,
                      })
                      setDialogOpen(true)
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
                      areaName:
                        (original.areaName as string | undefined) ??
                        (row.getValue('areaName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    baseActive
                      ? 'Deactivate mapping'
                      : 'Activate mapping'
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
        <CardTitle>Area Region Mapping</CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='area-region-mappings'
            worksheetName='AreaRegionMappings'
            customStyles={exportStatusStyles}
            disabled={!rows.length}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setDialogMode('create')
              setEditingId(null)
              setInitialValues(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Area Region Mapping
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
                    Loading area region mappings...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ??
                      'Failed to load area region mappings'}
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
                    No mappings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setDialogMode('create')
            setEditingId(null)
            setInitialValues(undefined)
          }
        }}
        title={
          dialogMode === 'create'
            ? 'Create Area Region Mapping'
            : 'Update Area Region Mapping'
        }
        description={
          dialogMode === 'create'
            ? 'Map areas to regions and channels.'
            : 'Update mapping details.'
        }
        hideFooter
      >
        <AreaRegionForm
          mode={dialogMode}
          mappingId={editingId ?? undefined}
          initialValues={initialValues}
          channels={channelsData ?? []}
          onSubmit={async () => {
            setDialogOpen(false)
            setDialogMode('create')
            setEditingId(null)
            setInitialValues(undefined)
          }}
          onCancel={() => {
            setDialogOpen(false)
            setDialogMode('create')
            setEditingId(null)
            setInitialValues(undefined)
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
        title='Change mapping status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this mapping${
                pendingToggle?.areaName
                  ? ` "${pendingToggle.areaName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this mapping${
                pendingToggle?.areaName
                  ? ` "${pendingToggle.areaName}"`
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
