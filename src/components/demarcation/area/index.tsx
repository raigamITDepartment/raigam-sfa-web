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
  deactivateArea,
  getAllArea,
  type ApiResponse,
  type AreaDTO,
  type Id,
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
import { AreaForm, type AreaFormValues } from './area-form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type AreaExportRow = {
  areaCode?: string
  areaName: string
  displayOrder?: number
  status: string
}

const getAreaRawStatus = (area: AreaDTO) =>
  (area.status as string | boolean | undefined) ??
  (area.isActive as boolean | undefined) ??
  (area.active as boolean | undefined)

const isAreaActive = (area: AreaDTO) => {
  const rawStatus = getAreaRawStatus(area)
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }
  return Boolean(rawStatus)
}

const getAreaStatusValue = (area: AreaDTO) =>
  isAreaActive(area) ? 'Active' : 'Inactive'

export default function Area() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await getAllArea()
      return res as ApiResponse<AreaDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((area) => {
      seen.add(getAreaStatusValue(area))
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])

  const toolbarFilters = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Status',
        options: statusFilterOptions,
      },
    ],
    [statusFilterOptions]
  )

  const exportRows = useMemo<AreaExportRow[]>(() => {
    return rows.map((area) => ({
      areaCode: area.areaCode,
      areaName: area.areaName,
      displayOrder: area.displayOrder,
      status: getAreaStatusValue(area),
    }))
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<AreaExportRow>[]>(() => {
    return [
      { header: 'Display Order', accessor: 'displayOrder' },
      { header: 'Area Code', accessor: 'areaCode' },
      { header: 'Area Name', accessor: 'areaName' },
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
  const [areaDialogOpen, setAreaDialogOpen] = useState(false)
  const [areaDialogMode, setAreaDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingAreaId, setEditingAreaId] = useState<Id | null>(null)
  const [areaInitialValues, setAreaInitialValues] = useState<
    Partial<AreaFormValues> | undefined
  >(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    areaName: string
    nextActive: boolean
  } | null>(null)

  useEffect(() => {
    if (!areaDialogOpen) {
      setAreaDialogMode('create')
      setEditingAreaId(null)
      setAreaInitialValues(undefined)
    }
  }, [areaDialogOpen])

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await deactivateArea(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<AreaDTO[]>>(
        ['areas'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((area) => {
            if (String(area.id) !== String(id)) return area
            const payload = response?.payload

            if (payload) {
              const resolvedActive =
                (payload.isActive as boolean | undefined) ??
                (payload.active as boolean | undefined) ??
                nextActive
              const resolvedStatus =
                payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
              return {
                ...area,
                ...payload,
                isActive: resolvedActive,
                active: resolvedActive,
                status: resolvedStatus,
              }
            }

            return {
              ...area,
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
            ? 'Area activated successfully'
            : 'Area deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update area status'
      toast.error(message)
    },
  })

  const columns = useMemo<ColumnDef<AreaDTO>[]>(
    () => [
      {
        accessorKey: 'areaCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Area Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('areaCode') ?? '—'}</span>
        ),
        meta: { thClassName: 'w-[180px]' },
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
        accessorKey: 'displayOrder',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Display Order' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('displayOrder') ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: getAreaStatusValue,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const original = row.original as AreaDTO
          const label = getAreaStatusValue(original)
          const baseActive = isAreaActive(original)
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
          const original = row.original as AreaDTO
          const recordId = original.id as Id | undefined
          const baseActive = isAreaActive(original)

          return (
            <div className='flex items-center justify-end gap-1 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit area'
                    onClick={() => {
                      setAreaDialogMode('edit')
                      setEditingAreaId(recordId ?? null)
                      setAreaInitialValues({
                        areaCode:
                          (original.areaCode as string | undefined) ?? '',
                        areaName:
                          (original.areaName as string | undefined) ?? '',
                        displayOrder:
                          (original.displayOrder as number | undefined) ?? 0,
                        isActive: baseActive,
                      })
                      setAreaDialogOpen(true)
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
                    baseActive ? 'Deactivate area' : 'Activate area'
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

  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const countLabel = isLoading ? '.../...' : `${filteredCount}/${totalCount}`

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle className='flex items-center gap-2'>
          Area List
          <CountBadge value={countLabel} />
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='areas'
            worksheetName='Areas'
            customStyles={exportStatusStyles}
            disabled={!rows.length}
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setAreaDialogMode('create')
              setEditingAreaId(null)
              setAreaInitialValues(undefined)
              setAreaDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Create Area
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
                    colSpan={columns.length}
                    className='h-20 text-center'
                  >
                    Loading areas...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load areas'}
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
                    No areas found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={areaDialogOpen}
        onOpenChange={(open) => {
          setAreaDialogOpen(open)
        }}
        title={areaDialogMode === 'create' ? 'Create Area' : 'Update Area'}
        description={
          areaDialogMode === 'create'
            ? 'Create a new area.'
            : 'Update area details.'
        }
        hideFooter
      >
        <AreaForm
          mode={areaDialogMode}
          areaId={editingAreaId ?? undefined}
          initialValues={areaInitialValues}
          onSubmit={async () => {
            setAreaDialogOpen(false)
          }}
          onCancel={() => {
            setAreaDialogOpen(false)
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
        title='Change area status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this area${
                pendingToggle?.areaName
                  ? ` "${pendingToggle.areaName}"`
                  : ''
              }?`
            : `Are you sure you want to deactivate this area${
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

