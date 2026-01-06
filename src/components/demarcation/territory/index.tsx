import { useEffect, useMemo, useState } from 'react'
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
  deactivateTerritory,
  getAllTerritories,
  type ApiResponse,
  type TerritoryDTO,
  type Id,
  type AreaDTO,
  type RangeDTO,
  getAllArea,
  getAllRange,
} from '@/services/userDemarcationApi'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
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
import { TerritoryForm, type TerritoryFormValues } from './territory-form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type TerritoryExportRow = {
  areaName?: string
  rangeName?: string
  displayOrder?: number
  territoryCode?: string
  territoryName?: string
  status: string
}

const getTerritoryRawStatus = (territory: TerritoryDTO) =>
  (territory.status as string | boolean | undefined) ??
  (territory.isActive as boolean | undefined) ??
  (territory.active as boolean | undefined)

const isTerritoryActive = (territory: TerritoryDTO) => {
  const rawStatus = getTerritoryRawStatus(territory)
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }
  return Boolean(rawStatus)
}

const getTerritoryStatusValue = (territory: TerritoryDTO) =>
  isTerritoryActive(territory) ? 'Active' : 'Inactive'

export default function Territory() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const res = await getAllTerritories()
      return res as ApiResponse<TerritoryDTO[]>
    },
  })

  const { data: areasData } = useQuery({
    queryKey: ['areas', 'lookup'],
    queryFn: async () => {
      const res = await getAllArea()
      return res as ApiResponse<AreaDTO[]>
    },
  })

  const { data: rangesData } = useQuery({
    queryKey: ['ranges', 'lookup'],
    queryFn: async () => {
      const res = await getAllRange()
      return res as ApiResponse<RangeDTO[]>
    },
  })

  const baseRows = useMemo(() => data?.payload ?? [], [data])

  const areaLookup = useMemo(() => {
    const map: Record<string, string> = {}
    ;(areasData?.payload ?? []).forEach((area) => {
      const id = area.id ?? (area as any).areaId
      if (id === undefined || id === null) return
      const name = area.areaName ?? (area as any).name
      if (name) map[String(id)] = name
    })
    return map
  }, [areasData])

  const rangeLookup = useMemo(() => {
    const map: Record<string, string> = {}
    ;(rangesData?.payload ?? []).forEach((range) => {
      const id = range.id ?? (range as any).rangeId
      if (id === undefined || id === null) return
      const name = range.rangeName ?? (range as any).name
      if (name) map[String(id)] = name
    })
    return map
  }, [rangesData])

  const rows = useMemo(() => {
    return baseRows.map((territory) => {
      const areaName =
        territory.areaName ??
        areaLookup[String(territory.areaId ?? '')] ??
        territory.areaName
      const rangeName =
        territory.rangeName ??
        rangeLookup[String(territory.rangeId ?? '')] ??
        territory.rangeName
      return {
        ...territory,
        areaName,
        rangeName,
      }
    })
  }, [areaLookup, baseRows, rangeLookup])

  const exportRows = useMemo<TerritoryExportRow[]>(() => {
    return rows.map((territory) => ({
      areaName: territory.areaName,
      rangeName: territory.rangeName,
      displayOrder: territory.displayOrder,
      territoryCode: territory.territoryCode,
      territoryName: territory.territoryName ?? territory.name,
      status: getTerritoryStatusValue(territory),
    }))
  }, [rows])

  const areaFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((territory) => {
      const area = territory.areaName?.trim()
      if (area) seen.add(area)
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])

  const rangeFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((territory) => {
      const range = territory.rangeName?.trim()
      if (range) seen.add(range)
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])

  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((territory) => {
      seen.add(getTerritoryStatusValue(territory))
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])

  const toolbarFilters = useMemo(
    () => [
      {
        columnId: 'areaName',
        title: 'Area',
        options: areaFilterOptions,
      },
      {
        columnId: 'rangeName',
        title: 'Range',
        options: rangeFilterOptions,
      },
      {
        columnId: 'status',
        title: 'Status',
        options: statusFilterOptions,
      },
    ],
    [areaFilterOptions, rangeFilterOptions, statusFilterOptions]
  )

  const exportColumns = useMemo<ExcelExportColumn<TerritoryExportRow>[]>(() => {
    return [
      { header: 'Area', accessor: 'areaName' },
      { header: 'Range', accessor: 'rangeName' },
      { header: 'Display Order', accessor: 'displayOrder' },
      { header: 'Territory Code', accessor: 'territoryCode' },
      { header: 'Territory Name', accessor: 'territoryName' },
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
  const [territoryDialogOpen, setTerritoryDialogOpen] = useState(false)
  const [territoryDialogMode, setTerritoryDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingTerritoryId, setEditingTerritoryId] = useState<Id | null>(null)
  const [territoryInitialValues, setTerritoryInitialValues] = useState<
    Partial<TerritoryFormValues> | undefined
  >(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    territoryName: string
    nextActive: boolean
  } | null>(null)

  useEffect(() => {
    if (!territoryDialogOpen) {
      setTerritoryDialogMode('create')
      setEditingTerritoryId(null)
      setTerritoryInitialValues(undefined)
    }
  }, [territoryDialogOpen])

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await deactivateTerritory(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<TerritoryDTO[]>>(
        ['territories'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((territory) => {
            const territoryId = territory.id
            if (String(territoryId) !== String(id)) return territory

            const payload = response?.payload
            if (payload) {
              const resolvedActive =
                (payload.isActive as boolean | undefined) ??
                (payload.active as boolean | undefined) ??
                nextActive
              const resolvedStatus =
                payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
              return {
                ...territory,
                ...payload,
                isActive: resolvedActive,
                active: resolvedActive,
                status: resolvedStatus,
              }
            }

            return {
              ...territory,
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
            ? 'Territory activated successfully'
            : 'Territory deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update territory status'
      toast.error(message)
    },
  })

  const _columns = useMemo<ColumnDef<TerritoryDTO>[]>(
    () => [
      {
        accessorKey: 'territoryCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {row.getValue('territoryCode') ?? '�?"'}
          </span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorKey: 'territoryName',
        accessorFn: (row) => row.territoryName ?? row.name ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('territoryName')}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: getTerritoryStatusValue,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as TerritoryDTO
          const label = getTerritoryStatusValue(original)
          const baseActive = isTerritoryActive(original)
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
          const original = row.original as TerritoryDTO
          const recordId = original.id as Id | undefined
          const baseActive = isTerritoryActive(original)

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit territory'
                    onClick={() => {
                      setTerritoryDialogMode('edit')
                      setEditingTerritoryId(recordId ?? null)
                      setTerritoryInitialValues({
                        channelId: original.channelId
                          ? String(original.channelId)
                          : '',
                        subChannelId: original.subChannelId
                          ? String(original.subChannelId)
                          : '',
                        areaId: original.areaId
                          ? String(original.areaId)
                          : '',
                        rangeId: original.rangeId
                          ? String(original.rangeId)
                          : '',
                        displayOrder:
                          (original.displayOrder as number | undefined) ?? 0,
                        territoryCode:
                          (original.territoryCode as string | undefined) ?? '',
                        territoryName:
                          (original.territoryName as string | undefined) ??
                          (original.name as string | undefined) ??
                          '',
                        isActive: baseActive,
                      })
                      setTerritoryDialogOpen(true)
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
                      territoryName:
                        (original.territoryName as string | undefined) ??
                        (original.name as string | undefined) ??
                        (row.getValue('territoryName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    baseActive ? 'Deactivate territory' : 'Activate territory'
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
  void _columns

  const territoryColumns = useMemo<ColumnDef<TerritoryDTO>[]>(
    () => [
      {
        accessorKey: 'areaName',
        accessorFn: (row) => row.areaName ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Area' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>
            {row.getValue('areaName') ?? '—'}
          </span>
        ),
        meta: { thClassName: 'w-[180px]' },
      },
      {
        accessorKey: 'rangeName',
        accessorFn: (row) => row.rangeName ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Range' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>
            {row.getValue('rangeName') ?? '—'}
          </span>
        ),
        meta: { thClassName: 'w-[160px]' },
      },
      {
        accessorKey: 'displayOrder',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Display Order' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {row.getValue('displayOrder') ?? '—'}
          </span>
        ),
        meta: { thClassName: 'w-[140px]' },
      },
      {
        accessorKey: 'territoryCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {row.getValue('territoryCode') ?? '—'}
          </span>
        ),
        meta: { thClassName: 'w-[160px]' },
      },
      {
        accessorKey: 'territoryName',
        accessorFn: (row) => row.territoryName ?? row.name ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('territoryName')}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: getTerritoryStatusValue,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as TerritoryDTO
          const label = getTerritoryStatusValue(original)
          const baseActive = isTerritoryActive(original)
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
          const original = row.original as TerritoryDTO
          const recordId = original.id as Id | undefined
          const baseActive = isTerritoryActive(original)

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit territory'
                    onClick={() => {
                      setTerritoryDialogMode('edit')
                      setEditingTerritoryId(recordId ?? null)
                      setTerritoryInitialValues({
                        channelId: original.channelId
                          ? String(original.channelId)
                          : '',
                        subChannelId: original.subChannelId
                          ? String(original.subChannelId)
                          : '',
                        areaId: original.areaId
                          ? String(original.areaId)
                          : '',
                        rangeId: original.rangeId
                          ? String(original.rangeId)
                          : '',
                        oldTerritoryId:
                          (original.oldTerritoryId as Id | undefined)
                            ? String(original.oldTerritoryId)
                            : '',
                        territoryCode:
                          (original.territoryCode as string | undefined) ?? '',
                        territoryName:
                          (original.territoryName as string | undefined) ??
                          (original.name as string | undefined) ??
                          '',
                        isActive: baseActive,
                      })
                      setTerritoryDialogOpen(true)
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
                      territoryName:
                        (original.territoryName as string | undefined) ??
                        (original.name as string | undefined) ??
                        (row.getValue('territoryName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={
                    baseActive ? 'Deactivate territory' : 'Activate territory'
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
    columns: territoryColumns,
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

  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const countLabel = isLoading ? '.../...' : `${filteredCount}/${totalCount}`

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle className='flex items-center gap-2'>
          Territory List
          <CountBadge value={countLabel} />
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='territories'
            worksheetName='Territories'
            customStyles={exportStatusStyles}
            disabled={!rows.length}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setTerritoryDialogMode('create')
              setEditingTerritoryId(null)
              setTerritoryInitialValues(undefined)
              setTerritoryDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Territory
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={toolbarFilters}
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
                    colSpan={territoryColumns.length}
                    className='h-20 text-center'
                  >
                    Loading territories...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={territoryColumns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load territories'}
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
                    colSpan={territoryColumns.length}
                    className='h-20 text-center'
                  >
                    No territories found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={territoryDialogOpen}
        onOpenChange={(open) => {
          setTerritoryDialogOpen(open)
        }}
        title={
          territoryDialogMode === 'create'
            ? 'Create Territory'
            : 'Update Territory'
        }
        description={
          territoryDialogMode === 'create'
            ? ''
            : 'Update territory details.'
        }
        hideFooter
      >
        <TerritoryForm
          mode={territoryDialogMode}
          territoryId={editingTerritoryId ?? undefined}
          initialValues={territoryInitialValues}
          onSubmit={async () => {
            setTerritoryDialogOpen(false)
          }}
          onCancel={() => {
            setTerritoryDialogOpen(false)
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
        title='Change territory status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this territory${
                pendingToggle?.territoryName
                  ? ` "${pendingToggle.territoryName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this territory${
                pendingToggle?.territoryName
                  ? ` "${pendingToggle.territoryName}"`
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
