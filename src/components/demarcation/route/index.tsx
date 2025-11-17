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
  type ApiResponse,
  type Id,
  type RouteDTO,
  activateRoute,
  deactivateRoute,
  getAllRoutes,
} from '@/services/userDemarcationApi'
import { Pencil, Plus } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { RouteForm, type RouteFormInput } from './route-form'

type RouteExportRow = {
  routeId: string
  routeCode: string
  routeName: string
  areaName: string
  territoryName: string
  territoryId: string
  oldRouteId: string
  status: string
}

export default function RouteComponent() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await getAllRoutes()
      return res as ApiResponse<RouteDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const exportRows = useMemo<RouteExportRow[]>(() => {
    return rows.map((route) => {
      const rawStatus =
        (route.status as string | boolean | undefined) ??
        (route.isActive as boolean | undefined) ??
        (route.active as boolean | undefined)
      const statusLabel =
        typeof rawStatus === 'string'
          ? rawStatus
          : rawStatus
            ? 'Active'
            : 'Inactive'

      return {
        routeId: String(route.id ?? ''),
        routeCode: String(route.routeCode ?? ''),
        routeName: route.routeName ?? '',
        territoryName: route.territoryName ?? '',
        territoryId: String(route.territoryId ?? ''),
        areaName: route.areaName ?? '',
        oldRouteId: String(route.oldRouteId ?? ''),
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<RouteExportRow>[]>(() => {
    return [
      { header: 'Route ID', accessor: 'routeId' },
      { header: 'Route Code', accessor: 'routeCode' },
      { header: 'Route Name', accessor: 'routeName' },
      { header: 'Area', accessor: 'areaName' },
      { header: 'Territory', accessor: 'territoryName' },
      { header: 'Territory ID', accessor: 'territoryId' },
      { header: 'Old Route ID', accessor: 'oldRouteId' },
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

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [routeDialogOpen, setRouteDialogOpen] = useState(false)
  const [routeDialogMode, setRouteDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingRouteId, setEditingRouteId] = useState<Id | null>(null)
  const [routeInitialValues, setRouteInitialValues] = useState<
    Partial<RouteFormInput> | undefined
  >(undefined)
  const [editingTerritoryName, setEditingTerritoryName] = useState<
    string | undefined
  >(undefined)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    routeName: string
    nextActive: boolean
  } | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    if (!routeDialogOpen) {
      setRouteDialogMode('create')
      setEditingRouteId(null)
      setRouteInitialValues(undefined)
      setEditingTerritoryName(undefined)
    }
  }, [routeDialogOpen])


  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = vars.nextActive
        ? await activateRoute(vars.id)
        : await deactivateRoute(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<RouteDTO[]>>(['routes'], (old) => {
        if (!old || !Array.isArray(old.payload)) return old
        const updatedPayload = old.payload.map((route) => {
          const routeId =
            (route.id as Id | undefined) ?? (route.routeCode as Id | undefined)
          if (String(routeId) !== String(id)) return route

          const payload = response?.payload
          if (payload) {
            const resolvedActive =
              (payload.isActive as boolean | undefined) ??
              (payload.active as boolean | undefined) ??
              nextActive
            const resolvedStatus =
              payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
            return {
              ...route,
              ...payload,
              isActive: resolvedActive,
              active: resolvedActive,
              status: resolvedStatus,
            }
          }

          return {
            ...route,
            isActive: nextActive,
            active: nextActive,
            status: nextActive ? 'Active' : 'Inactive',
          }
        })

        return {
          ...old,
          payload: updatedPayload,
        }
      })
      toast.success(
        response?.message ??
          (nextActive
            ? 'Route activated successfully'
            : 'Route deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to change route status'
      toast.error(message)
    },
  })

  const columns = useMemo<ColumnDef<RouteDTO>[]>(
    () => [
      {
        accessorKey: 'routeCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Route Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {(row.getValue('routeCode') as string) ?? '-'}
          </span>
        ),
        meta: { thClassName: 'w-[140px]' },
      },
      {
        accessorKey: 'routeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Route Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('routeName') ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'territoryName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('territoryName') ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'areaName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Area' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('areaName') ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'territoryId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory ID' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {String(row.getValue('territoryId') ?? '-')}
          </span>
        ),
        meta: { thClassName: 'w-[120px]' },
      },
      {
        accessorKey: 'oldRouteId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Old Route ID' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>
            {String(row.getValue('oldRouteId') ?? '-')}
          </span>
        ),
        meta: { thClassName: 'w-[120px]' },
      },
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Route ID' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{String(row.getValue('id') ?? '-')}</span>
        ),
        meta: { thClassName: 'w-[120px]' },
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as Record<string, unknown>
          const raw =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined)

          const isActive =
            typeof raw === 'string'
              ? raw.toLowerCase() === 'active'
              : Boolean(raw)
          const label = isActive ? 'Active' : 'Inactive'
          const variant = isActive ? 'secondary' : 'destructive'

          return (
            <Badge
              variant={variant}
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
          const original = row.original as Record<string, unknown>
          const rawStatus =
            (original.status as string | boolean | undefined) ??
            (original.isActive as boolean | undefined) ??
            (original.active as boolean | undefined)

          const recordId =
            (original.id as Id | undefined) ??
            (original.routeCode as Id | undefined) ??
            (row.id as Id)
          const isActive =
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
                    aria-label='Edit route'
                    onClick={() => {
                      const territoryIdRaw = original.territoryId as
                        | Id
                        | undefined
                      setRouteDialogMode('edit')
                      setEditingRouteId(recordId ?? null)
                      setEditingTerritoryName(
                        (original.territoryName as string | undefined) ?? undefined
                      )
                      setRouteInitialValues({
                        areaId: (original.areaId as Id | undefined)
                          ? String(original.areaId)
                          : '',
                        territoryId: territoryIdRaw
                          ? String(territoryIdRaw)
                          : '',
                        routeCode:
                          (original.routeCode as string | undefined) ?? '',
                        routeName:
                          (original.routeName as string | undefined) ?? '',
                        displayOrder:
                          (original.displayOrder as number | undefined) ?? 0,
                        oldRouteId: String(original.oldRouteId ?? ''),
                        oldRouteCode:
                          (original.oldRouteCode as string | undefined) ?? '',
                        isActive,
                      })
                      setRouteDialogOpen(true)
                    }}
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
                    if (recordId == null) return
                    setPendingToggle({
                      id: recordId,
                      routeName:
                        (original.routeName as string | undefined) ??
                        (row.getValue('routeName') as string | undefined) ??
                        '',
                      nextActive: value,
                    })
                    setConfirmOpen(true)
                  }}
                  aria-label={isActive ? 'Deactivate route' : 'Activate route'}
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
        <CardTitle>Route List</CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='routes'
            worksheetName='Routes'
            customStyles={exportStatusStyles}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setRouteDialogMode('create')
              setEditingRouteId(null)
              setRouteInitialValues(undefined)
              setEditingTerritoryName(undefined)
              setRouteDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Route
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
                    Loading routes...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load routes'}
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
                    No routes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={routeDialogOpen}
        onOpenChange={(open) => {
          setRouteDialogOpen(open)
        }}
        title={routeDialogMode === 'create' ? 'Create Route' : 'Update Route'}
        description={
          routeDialogMode === 'create'
            ? 'Create a new route and assign it to a territory.'
            : 'Update route details.'
        }
        hideFooter
      >
        <RouteForm
          mode={routeDialogMode}
          routeId={editingRouteId ?? undefined}
          initialValues={routeInitialValues}
          initialTerritoryName={
            routeDialogMode === 'edit' ? editingTerritoryName : undefined
          }
          onSubmit={async () => {
            setRouteDialogOpen(false)
          }}
          onCancel={() => {
            setRouteDialogOpen(false)
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
        title='Change route status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this route${
                pendingToggle?.routeName ? ` "${pendingToggle.routeName}"` : ''
              }?`
            : `Are you sure you want to deactivate this route${
                pendingToggle?.routeName ? ` "${pendingToggle.routeName}"` : ''
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
