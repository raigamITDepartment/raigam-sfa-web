import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { OutletFilter } from '@/components/outlet-module/Filter'
import { TableLoadingRows } from '@/components/data-table'
import {
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { CommonAlert } from '@/components/common-alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ExcelExportButton } from '@/components/excel-export-button'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon } from 'lucide-react'
import FullWidthDialog from '@/components/FullWidthDialog'
import { EditOutletForm } from '@/components/outlet-module/EditOutletForm'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  approvalOutlet,
  deactivateOutlet,
  getAllOutletsByRequiredArgs,
} from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type { OutletRecord } from '@/types/outlet'
import { createOutletColumns } from '@/components/outlet-module/outlet-list-columns'
import { createOutletExportColumns } from '@/components/outlet-module/outlet-list-export'
import {
  formatRangeLabel,
  parseCreatedDate,
  pickFirstValue,
  buildFacetOptions,
} from '@/components/outlet-module/outlet-list-utils'
import { toast } from 'sonner'
import { useAppSelector } from '@/store/hooks'
import { RoleId, SubRoleId } from '@/lib/authz'

const FILTER_STORAGE_KEY = 'outlet-list-filters'

type OutletFilterState = {
  channelId?: string
  subChannelId?: string
  areaId?: string
  territoryId?: string
  routeId?: string
}

const readStoredFilters = (): OutletFilterState => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as OutletFilterState
    return parsed ?? {}
  } catch {
    return {}
  }
}

const writeStoredFilters = (filters: OutletFilterState | null) => {
  if (typeof window === 'undefined') return
  if (!filters) {
    window.localStorage.removeItem(FILTER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

const getOutletKey = (row: OutletRecord) =>
  pickFirstValue(row, ['uniqueCode', 'outletCode', 'outletId', 'id'])

const dedupeOutlets = (items: OutletRecord[]) => {
  const seen = new Set<string>()
  return items.filter((row) => {
    const key = getOutletKey(row)
    if (key === null || key === undefined || key === '') return true
    const normalized = String(key)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

export const OutletList = () => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const persistedAuth = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('auth_user')
      return raw
        ? (JSON.parse(raw) as {
            channelId?: unknown
            channelName?: unknown
            subChannelId?: unknown
            subChannelName?: unknown
            areaNameList?: unknown
            territoryId?: unknown
          })
        : null
    } catch {
      return null
    }
  }, [])
  const lockedChannel = useMemo(() => {
    if (!persistedAuth) return null
    const channelId = persistedAuth?.channelId
    const channelName =
      typeof persistedAuth?.channelName === 'string'
        ? persistedAuth.channelName.trim()
        : ''
    if (!channelName) return null
    if (channelId === null || channelId === undefined) return null
    const normalizedId = String(channelId).trim()
    if (!normalizedId) return null
    return { id: normalizedId, name: channelName }
  }, [persistedAuth])
  const lockedSubChannel = useMemo(() => {
    if (!persistedAuth) return null
    const subChannelId = persistedAuth?.subChannelId
    const subChannelName =
      typeof persistedAuth?.subChannelName === 'string'
        ? persistedAuth.subChannelName.trim()
        : ''
    if (!subChannelName) return null
    if (subChannelId === null || subChannelId === undefined) return null
    const normalizedId = String(subChannelId).trim()
    if (!normalizedId) return null
    return { id: normalizedId, name: subChannelName }
  }, [persistedAuth])
  const lockedTerritoryId = useMemo(() => {
    if (!persistedAuth) return ''
    const territoryId = persistedAuth?.territoryId
    if (territoryId === null || territoryId === undefined) return ''
    const normalizedId = String(territoryId).trim()
    if (!normalizedId || normalizedId === '0') return ''
    return normalizedId
  }, [persistedAuth])
  const lockedAreaId = useMemo(() => {
    const list = (persistedAuth as { areaNameList?: unknown })?.areaNameList
    if (!Array.isArray(list) || list.length !== 1) return ''
    const item = list[0]
    if (!item || typeof item !== 'object') return ''
    const record = item as {
      id?: number | string
      areaId?: number | string
    }
    const id = record.id ?? record.areaId
    if (id === undefined || id === null) return ''
    const normalizedId = String(id).trim()
    if (!normalizedId) return ''
    return normalizedId
  }, [persistedAuth])
  const lockedChannelId = lockedChannel?.id ?? ''
  const lockedSubChannelId = lockedSubChannel?.id ?? ''
  const storedFilters = readStoredFilters()
  const storedChannelId = storedFilters.channelId?.trim() ?? ''
  const storedSubChannelId = storedFilters.subChannelId?.trim() ?? '0'
  const storedAreaId = storedFilters.areaId?.trim() ?? '0'
  const resolvedChannelId = lockedChannelId || storedChannelId
  const channelMismatch =
    Boolean(lockedChannelId) && storedChannelId !== lockedChannelId
  const subChannelMismatch =
    Boolean(lockedSubChannelId) && storedSubChannelId !== lockedSubChannelId
  const resetBelowSubChannel = channelMismatch || subChannelMismatch
  const resolvedSubChannelId =
    lockedSubChannelId || (channelMismatch ? '0' : storedSubChannelId)
  const resolvedAreaId =
    lockedAreaId || (resetBelowSubChannel ? '0' : storedAreaId)
  const areaMismatch =
    Boolean(lockedAreaId) && storedAreaId !== lockedAreaId
  const resetBelowArea = resetBelowSubChannel || areaMismatch
  const storedTerritoryId = storedFilters.territoryId?.trim() ?? '0'
  const resolvedTerritoryId =
    lockedTerritoryId || (resetBelowArea ? '0' : storedTerritoryId)
  const territoryMismatch =
    Boolean(lockedTerritoryId) && storedTerritoryId !== lockedTerritoryId
  const resetBelowTerritory = resetBelowArea || territoryMismatch
  const storedRouteId = resetBelowTerritory
    ? '0'
    : (storedFilters.routeId?.trim() ?? '0')
  const [channelId, setChannelId] = useState<string>(resolvedChannelId)
  const [subChannelId, setSubChannelId] = useState<string>(resolvedSubChannelId)
  const [areaId, setAreaId] = useState<string>(resolvedAreaId)
  const [territoryId, setTerritoryId] = useState<string>(resolvedTerritoryId)
  const [routeId, setRouteId] = useState<string>(storedRouteId)
  const [activeOutlet, setActiveOutlet] = useState<OutletRecord | null>(null)
  const [dialogMode, setDialogMode] = useState<'edit' | 'view'>('edit')
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    uniqueCode: false,
    channelName: false,
    areaName: false,
    route: false,
  })
  const [createdRange, setCreatedRange] = useState<DateRange | undefined>()
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>()
  const [applyError, setApplyError] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [pendingApprove, setPendingApprove] = useState<OutletRecord | null>(
    null
  )
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<{
    outlet: OutletRecord
    nextActive: boolean
  } | null>(null)

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: [
      'user-demarcation',
      'outlets',
      'by-required-args',
      channelId,
      subChannelId,
      areaId,
      territoryId,
      routeId,
    ],
    enabled: Boolean(channelId),
    queryFn: async () => {
      const res = (await getAllOutletsByRequiredArgs({
        channelId,
        subChannelId,
        areaId,
        territoryId,
        routeId,
      })) as ApiResponse<OutletRecord[]>
      return res.payload ?? []
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (vars: { outletId: string | number }) =>
      approvalOutlet(vars.outletId),
    onSuccess: (response) => {
      toast.success(response?.message ?? 'Outlet approved successfully')
      queryClient.invalidateQueries({ queryKey: ['user-demarcation', 'outlets'] })
    },
    onError: (error) => {
      toast.error((error as Error)?.message ?? 'Failed to approve outlet')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (vars: { outletId: string | number }) =>
      deactivateOutlet(vars.outletId),
    onSuccess: (response) => {
      toast.success(
        response?.message ?? 'Outlet status updated successfully'
      )
      queryClient.invalidateQueries({ queryKey: ['user-demarcation', 'outlets'] })
    },
    onError: (error) => {
      toast.error(
        (error as Error)?.message ?? 'Failed to update outlet status'
      )
    },
  })

  const handleApprove = useCallback(
    (record: OutletRecord) => {
      setPendingApprove(record)
      setApproveConfirmOpen(true)
    },
    []
  )

  const handleToggleActive = useCallback(
    (record: OutletRecord, nextActive: boolean) => {
      setPendingStatus({ outlet: record, nextActive })
      setStatusConfirmOpen(true)
    },
    []
  )

  const outletRows = channelId ? rows : []
  const uniqueOutletRows = useMemo(
    () => dedupeOutlets(outletRows),
    [outletRows]
  )

  const effectiveRoleId = Number(user?.roleId ?? user?.userGroupId)
  const canEditOutlet =
    user?.userGroupId === RoleId.SystemAdmin ||
    user?.userGroupId === RoleId.ManagerSales ||
    effectiveRoleId === SubRoleId.Admin ||
    effectiveRoleId === SubRoleId.RegionSalesManager ||
    effectiveRoleId === SubRoleId.AreaSalesManager ||
    effectiveRoleId === SubRoleId.Representative

  const outletDialogTitle = useMemo(() => {
    if (!activeOutlet) return 'Edit Outlet'
    const outletName = pickFirstValue(activeOutlet, ['outletName', 'name'])
    if (dialogMode === 'view') {
      return outletName ? String(outletName) : 'Outlet Details'
    }
    return 'Edit Outlet'
  }, [activeOutlet, dialogMode])

  const columns = useMemo<ColumnDef<OutletRecord>[]>(
    () =>
      createOutletColumns({
        onView: (record) => {
          setDialogMode('view')
          setActiveOutlet(record)
        },
        onEdit: (record) => {
          setDialogMode('edit')
          setActiveOutlet(record)
        },
        onApprove: handleApprove,
        onToggleActive: handleToggleActive,
        canEdit: canEditOutlet,
      }),
    [handleApprove, handleToggleActive, canEditOutlet]
  )

  const filteredData = useMemo(() => {
    if (!createdRange?.from) {
      return uniqueOutletRows
    }
    if (!createdRange.to) {
      const target = new Date(createdRange.from)
      target.setHours(0, 0, 0, 0)
      const end = new Date(createdRange.from)
      end.setHours(23, 59, 59, 999)
      return uniqueOutletRows.filter((row) => {
        const created = parseCreatedDate(row.created)
        if (!created) return false
        return created >= target && created <= end
      })
    }
    const from = createdRange.from
    const to = createdRange.to
    if (!from || !to) return uniqueOutletRows
    return uniqueOutletRows.filter((row) => {
      const created = parseCreatedDate(row.created)
      if (!created) return false
      const start = new Date(from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      return created >= start && created <= end
    })
  }, [uniqueOutletRows, createdRange])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      pagination,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const categoryFilterOptions = useMemo(() => {
    return buildFacetOptions(
      filteredData.map((row) =>
        pickFirstValue(row, [
          'outletCategoryName',
          'outletCategory',
          'category',
        ])
      )
    )
  }, [filteredData])

  const territoryFilterOptions = useMemo(
    () =>
      buildFacetOptions(filteredData.map((row) => row.territoryName)),
    [filteredData]
  )

  const approvedFilterOptions = useMemo(
    () => [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ],
    []
  )

  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
    []
  )
  const filteredRows = table.getFilteredRowModel().rows
  const filteredCount = filteredRows.length
  const exportRows = filteredRows.map((row) => row.original)
  const showFilterAlert = applyError || !channelId
  const exportColumns = useMemo(() => createOutletExportColumns(), [])

  return (
    <div className='space-y-3'>
      <OutletFilter
        initialValues={storedFilters}
        onApply={(filters) => {
          const nextChannelId = lockedChannelId || filters.channelId?.trim() || ''
          const nextSubChannelId =
            lockedSubChannelId || filters.subChannelId?.trim() || '0'
          const nextAreaId = lockedAreaId || filters.areaId?.trim() || '0'
          const nextTerritoryId =
            lockedTerritoryId || filters.territoryId?.trim() || '0'
          const nextRouteId = filters.routeId?.trim() ?? '0'
          if (!nextChannelId) {
            setApplyError(true)
            return
          }
          setApplyError(false)
          writeStoredFilters({
            channelId: nextChannelId,
            subChannelId: nextSubChannelId,
            areaId: nextAreaId,
            territoryId: nextTerritoryId,
            routeId: nextRouteId,
          })
          setChannelId(nextChannelId)
          setSubChannelId(nextSubChannelId)
          setAreaId(nextAreaId)
          setTerritoryId(nextTerritoryId)
          setRouteId(nextRouteId)
        }}
        onReset={() => {
          setApplyError(false)
          writeStoredFilters(null)
          setChannelId(lockedChannelId || '')
          setSubChannelId(lockedSubChannelId || '0')
          setAreaId(lockedAreaId || '0')
          setTerritoryId(lockedTerritoryId || '0')
          setRouteId('0')
        }}
      />
      {showFilterAlert && (
        <CommonAlert
          variant='warning'
          title='Select a channel'
          description='Please select a channel to view outlets.'
        />
      )}
      {channelId ? (
        <Card>
          <CardHeader className='flex items-center justify-between gap-2'>
            <CardTitle className='text-base font-semibold'>
              Outlet List{' '}
              <CountBadge
                value={`${filteredCount}/${uniqueOutletRows.length}`}
              />
            </CardTitle>
            <ExcelExportButton
              data={exportRows}
              columns={exportColumns}
              fileName='outlet-list'
              variant='outline'
              className='h-9 gap-2 rounded-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            />
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <DataTableToolbar
                table={table}
                searchPlaceholder='Search outlets...'
                filters={[
                  {
                    columnId: 'category',
                    title: 'Category',
                    options: categoryFilterOptions,
                    showCountBadge: true,
                  },
                  {
                    columnId: 'territoryName',
                    title: 'Territory',
                    options: territoryFilterOptions,
                    showCountBadge: true,
                  },
                  {
                    columnId: 'approved',
                    title: 'Approved',
                    options: approvedFilterOptions,
                    showCountBadge: true,
                  },
                  {
                    columnId: 'status',
                    title: 'Status',
                    options: statusFilterOptions,
                    showCountBadge: true,
                  },
                ]}
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-9 min-w-[220px] justify-start'
                    >
                      <span className='truncate'>
                        {formatRangeLabel(createdRange)}
                      </span>
                      <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='end'>
                    <div className='p-3'>
                      <Calendar
                        mode='range'
                        selected={pendingRange ?? createdRange}
                        onSelect={(range) => {
                          setPendingRange(range)
                        }}
                        numberOfMonths={2}
                      />
                      <div className='mt-3 flex justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setPendingRange(undefined)}
                        >
                          Clear
                        </Button>
                        <Button
                          size='sm'
                          onClick={() => {
                            if (!pendingRange?.from) return
                            const nextRange = pendingRange.to
                              ? pendingRange
                              : {
                                  from: pendingRange.from,
                                  to: pendingRange.from,
                                }
                            setCreatedRange(nextRange)
                            setPendingRange(undefined)
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {(createdRange?.from || createdRange?.to) && (
                  <Button
                    variant='ghost'
                    className='h-9 px-3'
                    onClick={() => {
                      setCreatedRange(undefined)
                      setPendingRange(undefined)
                    }}
                  >
                    Clear dates
                  </Button>
                )}
              </div>
            </div>
            <div className='rounded-md border'>
              <Table className='text-xs'>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className='text-muted-foreground bg-gray-100 whitespace-nowrap px-3 text-xs font-semibold tracking-wide uppercase dark:bg-gray-900'
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
                    <TableLoadingRows columns={columns.length} />
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='text-destructive h-20 text-center'
                      >
                        {(error as Error)?.message ?? 'Failed to load outlets'}
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className='whitespace-nowrap px-3 py-2'
                          >
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
                        className='h-20 text-center text-slate-500'
                      >
                        No outlets found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      ) : null}
      <FullWidthDialog
        open={Boolean(activeOutlet)}
        onOpenChange={(open) => {
          if (!open) setActiveOutlet(null)
        }}
        title={outletDialogTitle}
        width='full'
      >
        {activeOutlet ? (
          <EditOutletForm
            outlet={activeOutlet}
            mode={dialogMode}
            onSubmit={() => setActiveOutlet(null)}
          />
        ) : null}
      </FullWidthDialog>
      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={(open) => {
          setApproveConfirmOpen(open)
          if (!open) setPendingApprove(null)
        }}
        title='Approve outlet?'
        desc={
          pendingApprove
            ? `Are you sure you want to approve this outlet${
                pendingApprove.outletName || pendingApprove.name
                  ? ` "${pendingApprove.outletName ?? pendingApprove.name}"`
                  : ''
              }?`
            : 'Are you sure you want to approve this outlet?'
        }
        confirmText='Yes, approve'
        cancelBtnText='No'
        isLoading={approveMutation.isPending}
        handleConfirm={() => {
          if (!pendingApprove) return
          const outletId = pendingApprove.outletId ?? pendingApprove.id
          if (outletId === null || outletId === undefined || outletId === '') {
            toast.error('Outlet id is required to approve outlet')
            return
          }
          approveMutation.mutate({ outletId })
          setApproveConfirmOpen(false)
          setPendingApprove(null)
        }}
      />
      <ConfirmDialog
        destructive
        open={statusConfirmOpen}
        onOpenChange={(open) => {
          setStatusConfirmOpen(open)
          if (!open) setPendingStatus(null)
        }}
        title='Change outlet status?'
        desc={
          pendingStatus
            ? `Are you sure you want to ${
                pendingStatus.nextActive ? 'activate' : 'deactivate'
              } this outlet${
                pendingStatus.outlet.outletName || pendingStatus.outlet.name
                  ? ` "${
                      pendingStatus.outlet.outletName ??
                      pendingStatus.outlet.name
                    }"`
                  : ''
              }?`
            : 'Are you sure you want to change this outlet status?'
        }
        confirmText={
          pendingStatus?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
        cancelBtnText='No'
        isLoading={deactivateMutation.isPending}
        handleConfirm={() => {
          if (!pendingStatus) return
          const outletId = pendingStatus.outlet.outletId ?? pendingStatus.outlet.id
          if (outletId === null || outletId === undefined || outletId === '') {
            toast.error('Outlet id is required to update status')
            return
          }
          deactivateMutation.mutate({ outletId })
          setStatusConfirmOpen(false)
          setPendingStatus(null)
        }}
      />
    </div>
  )
}
