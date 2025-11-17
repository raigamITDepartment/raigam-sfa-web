import { useEffect, useMemo, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { CommonDialog } from '@/components/common-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import { AgencyForm, type AgencyFormValues } from './agency-form'

type AgencyExportRow = {
  agencyCode?: number | string
  agencyName?: string
  channelName?: string
  range?: string
  territoryName?: string
  status: string
}

export default function Agency() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const res = await getAllAgency()
      return res as ApiResponse<AgencyDTO[]>
    },
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: Id
    agencyName?: string
    nextActive: boolean
  } | null>(null)
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false)
  const [agencyDialogMode, setAgencyDialogMode] = useState<'create' | 'edit'>(
    'create'
  )
  const [editingAgencyId, setEditingAgencyId] = useState<Id | null>(null)
  const [agencyInitialValues, setAgencyInitialValues] = useState<
    Partial<AgencyFormValues> | undefined
  >(undefined)

  const rows = useMemo(() => data?.payload ?? [], [data])

  useEffect(() => {
    if (!agencyDialogOpen) {
      setAgencyDialogMode('create')
      setEditingAgencyId(null)
      setAgencyInitialValues(undefined)
    }
  }, [agencyDialogOpen])

  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: Id; nextActive: boolean }) => {
      const response = await toggleAgencyActive(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<ApiResponse<AgencyDTO[]>>(['agencies'], (old) => {
        if (!old || !Array.isArray(old.payload)) return old
        const updatedPayload = old.payload.map((agency) => {
          if (String(agency.id) !== String(id)) return agency
          const payload = response?.payload
          if (payload) {
            const resolvedActive =
              (payload.isActive as boolean | undefined) ??
              (payload.active as boolean | undefined) ??
              nextActive
            const resolvedStatus =
              payload.status ?? (resolvedActive ? 'Active' : 'Inactive')
            return {
              ...agency,
              ...payload,
              isActive: resolvedActive,
              active: resolvedActive,
              status: resolvedStatus,
            }
          }
          return {
            ...agency,
            isActive: nextActive,
            active: nextActive,
            status: nextActive ? 'Active' : 'Inactive',
          }
        })
        return { ...old, payload: updatedPayload }
      })
      toast.success(
        response?.message ??
          (nextActive
            ? 'Agency activated successfully'
            : 'Agency deactivated successfully')
      )
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update agency status'
      toast.error(message)
    },
  })

  const exportRows = useMemo<AgencyExportRow[]>(() => {
    return rows.map((agency) => {
      const rawStatus =
        (agency.status as string | boolean | undefined) ??
        (agency.isActive as boolean | undefined) ??
        (agency.active as boolean | undefined)
      const statusLabel =
        typeof rawStatus === 'string'
          ? rawStatus
          : rawStatus
            ? 'Active'
            : 'Inactive'

      return {
        agencyCode: agency.agencyCode,
        agencyName: agency.agencyName,
        channelName: agency.channelName,
        range: agency.range,
        territoryName: agency.territoryName,
        status: statusLabel,
      }
    })
  }, [rows])

  const exportColumns = useMemo<ExcelExportColumn<AgencyExportRow>[]>(() => {
    return [
      { header: 'Agency Code', accessor: 'agencyCode' },
      { header: 'Agency Name', accessor: 'agencyName' },
      { header: 'Channel', accessor: 'channelName' },
      { header: 'Range', accessor: 'range' },
      { header: 'Territory', accessor: 'territoryName' },
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

  const columns = useMemo<ColumnDef<AgencyDTO>[]>(() => {
    return [
      {
        accessorKey: 'agencyCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Agency Code' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('agencyCode') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[160px]' },
      },
      {
        accessorKey: 'agencyName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Agency Name' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>{row.getValue('agencyName') ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'channelName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('channelName') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[160px]' },
      },
      {
        accessorKey: 'range',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Range' />
        ),
        cell: ({ row }) => (
          <span className='pl-4'>{row.getValue('range') ?? '-'}</span>
        ),
        meta: { thClassName: 'w-[120px]' },
      },
      {
        accessorKey: 'territoryName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory' />
        ),
        cell: ({ row }) => (
          <span className='pl-4 truncate'>
            {row.getValue('territoryName') ?? '-'}
          </span>
        ),
        meta: { thClassName: 'w-[200px]' },
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const agency = row.original
          const rawStatus =
            (agency.status as string | boolean | undefined) ??
            (agency.isActive as boolean | undefined) ??
            (agency.active as boolean | undefined)
          const isActive =
            typeof rawStatus === 'string'
              ? rawStatus.toLowerCase() === 'active'
              : Boolean(rawStatus)
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
          const agency = row.original
          const rawStatus =
            (agency.status as string | boolean | undefined) ??
            (agency.isActive as boolean | undefined) ??
            (agency.active as boolean | undefined)
          const isActive =
            typeof rawStatus === 'string'
              ? rawStatus.toLowerCase() === 'active'
              : Boolean(rawStatus)
          const label =
            agency.agencyName ??
            (agency.agencyCode ? String(agency.agencyCode) : 'Agency record')

          const handleEdit = () => {
            const recordId = agency.id
            if (recordId == null) return
            setAgencyDialogMode('edit')
            setEditingAgencyId(recordId)
            setAgencyInitialValues({
              channelId: agency.channelId ? String(agency.channelId) : '',
              subChannelId: agency.subChannelId ? String(agency.subChannelId) : '',
              territoryId: agency.territoryId ? String(agency.territoryId) : '',
              agencyName: agency.agencyName ?? '',
              agencyCode:
                agency.agencyCode != null ? String(agency.agencyCode) : '',
              oldAgencyCode:
                agency.oldAgencyCode == null
                  ? ''
                  : String(agency.oldAgencyCode),
              isActive,
            })
            setAgencyDialogOpen(true)
          }

          const handleToggle = (value: boolean) => {
            const recordId = agency.id
            if (recordId == null) return
            setPendingToggle({
              id: recordId,
              agencyName: label,
              nextActive: value,
            })
            setConfirmOpen(true)
          }

          return (
            <div className='flex items-center justify-end gap-2 pr-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Edit agency'
                    onClick={handleEdit}
                  >
                    <Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                aria-label={
                  isActive ? 'Deactivate agency' : 'Activate agency'
                }
              />
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-[160px]' },
      },
    ]
  }, [])

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

  const exportStatusStyles = `
.status-active { background-color: #d1fae5; color: #065f46; font-weight: 600; }
.status-inactive { background-color: #fee2e2; color: #991b1b; font-weight: 600; }
`

  return (
  <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle>Agency List</CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            customStyles={exportStatusStyles}
            disabled={!exportRows.length}
          >
            Export
          </ExcelExportButton>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setAgencyDialogMode('create')
              setEditingAgencyId(null)
              setAgencyInitialValues(undefined)
              setAgencyDialogOpen(true)
            }}
          >
            <Plus className='-mr-1 h-4 w-4' />
            Create Agency
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search agencies...'
          searchKey='agencyName'
        />
        <div className='rounded-md border'>
          <Table>
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
      <CommonDialog
        open={agencyDialogOpen}
        onOpenChange={(open) => setAgencyDialogOpen(open)}
        title={
          agencyDialogMode === 'create'
            ? 'Create Agency'
            : 'Update Agency'
        }
        description={
          agencyDialogMode === 'create'
            ? 'Create a new agency.'
            : 'Update agency details.'
        }
        hideFooter
      >
        <AgencyForm
          mode={agencyDialogMode}
          agencyId={editingAgencyId ?? undefined}
          initialValues={agencyInitialValues}
          onSubmit={async () => {
            setAgencyDialogOpen(false)
          }}
          onCancel={() => {
            setAgencyDialogOpen(false)
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
        confirmText={pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'}
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
