import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
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
import { ExcelExportButton } from '@/components/excel-export-button'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon } from 'lucide-react'
import FullWidthDialog from '@/components/FullWidthDialog'
import { EditOutletForm } from '@/components/outlet-module/EditOutletForm'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  findOutletById,
  getAllOutletsByRequiredArgs,
  updateOutlet,
  type UpdateOutletRequest,
} from '@/services/userDemarcation/endpoints'
import type { ApiResponse, Id } from '@/types/common'
import type { OutletRecord } from '@/types/outlet'
import { createOutletColumns } from '@/components/outlet-module/outlet-list-columns'
import { createOutletExportColumns } from '@/components/outlet-module/outlet-list-export'
import {
  formatRangeLabel,
  parseCreatedDate,
  pickFirstValue,
} from '@/components/outlet-module/outlet-list-utils'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'

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

const resolveNonEmpty = <T,>(...values: Array<T | null | undefined>) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value
  }
  return undefined
}

const resolveRequiredString = (label: string, ...values: unknown[]) => {
  const resolved = resolveNonEmpty(...values)
  const text = resolved === undefined ? '' : String(resolved).trim()
  if (!text) {
    throw new Error(`${label} is required.`)
  }
  return text
}

const resolveRequiredValue = <T,>(
  label: string,
  ...values: Array<T | null | undefined>
) => {
  const resolved = resolveNonEmpty(...values)
  if (resolved === undefined) {
    throw new Error(`${label} is required.`)
  }
  return resolved as NonNullable<T>
}

const resolveRequiredId = (label: string, ...values: unknown[]) => {
  const resolved = resolveNonEmpty(...values)
  if (resolved === undefined) {
    throw new Error(`${label} is required.`)
  }
  return resolved as Id
}

const resolveBoolean = (...values: Array<boolean | null | undefined>) => {
  for (const value of values) {
    if (value !== null && value !== undefined) return value
  }
  return false
}

const toStringValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)

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
  const storedFilters = readStoredFilters()
  const storedChannelId = storedFilters.channelId?.trim() ?? ''
  const storedSubChannelId = storedFilters.subChannelId?.trim() ?? '0'
  const storedAreaId = storedFilters.areaId?.trim() ?? '0'
  const storedTerritoryId = storedFilters.territoryId?.trim() ?? '0'
  const storedRouteId = storedFilters.routeId?.trim() ?? '0'
  const [channelId, setChannelId] = useState<string>(storedChannelId)
  const [subChannelId, setSubChannelId] = useState<string>(storedSubChannelId)
  const [areaId, setAreaId] = useState<string>(storedAreaId)
  const [territoryId, setTerritoryId] = useState<string>(storedTerritoryId)
  const [routeId, setRouteId] = useState<string>(storedRouteId)
  const [editOutlet, setEditOutlet] = useState<OutletRecord | null>(null)
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
    mutationFn: async (vars: {
      outlet: OutletRecord
      nextApproved: boolean
    }) => {
      const userId = user?.userId
      if (!userId) {
        throw new Error('User id is required to update outlet.')
      }

      const outletId = resolveRequiredId(
        'Outlet id',
        vars.outlet.id,
        vars.outlet.outletId
      )
      const outletDetailsRes = (await findOutletById(
        outletId
      )) as ApiResponse<OutletRecord>
      const outletDetails = outletDetailsRes.payload ?? {}

      const outletCategoryId = resolveRequiredId(
        'Outlet category',
        outletDetails.outletCategoryId,
        vars.outlet.outletCategoryId
      )
      const routeId = resolveRequiredId(
        'Route',
        outletDetails.routeId,
        vars.outlet.routeId
      )
      const rangeId = resolveRequiredId(
        'Range',
        outletDetails.rangeId,
        vars.outlet.rangeId
      )

      const outletName = resolveRequiredString(
        'Outlet name',
        outletDetails.outletName,
        vars.outlet.outletName,
        vars.outlet.name
      )
      const address1 = resolveRequiredString(
        'Address 1',
        outletDetails.address1,
        vars.outlet.address1
      )
      const address2 = resolveRequiredString(
        'Address2',
        outletDetails.address2,
        vars.outlet.address2
      )
      const address3 = resolveRequiredString(
        'Address3',
        outletDetails.address3,
        vars.outlet.address3
      )
      const ownerName = resolveRequiredString(
        'Owner name',
        outletDetails.ownerName,
        vars.outlet.ownerName,
        vars.outlet.owner
      )
      const mobileNo = resolveRequiredString(
        'Mobile number',
        outletDetails.mobileNo,
        vars.outlet.mobileNo,
        vars.outlet.mobile
      )
      const latitude = resolveRequiredString(
        'Latitude',
        outletDetails.latitude,
        vars.outlet.latitude
      )
      const longitude = resolveRequiredString(
        'Longitude',
        outletDetails.longitude,
        vars.outlet.longitude
      )
      const displayOrder = resolveRequiredValue(
        'Display order',
        outletDetails.displayOrder,
        vars.outlet.displayOrder
      )
      const openTime = resolveRequiredString(
        'Open time',
        outletDetails.openTime,
        vars.outlet.openTime
      )
      const closeTime = resolveRequiredString(
        'Close time',
        outletDetails.closeTime,
        vars.outlet.closeTime
      )
      const outletSequence = resolveRequiredValue(
        'Outlet sequence',
        outletDetails.outletSequence,
        vars.outlet.outletSequence
      )
      const vatNumValue = resolveNonEmpty(
        outletDetails.vatNum,
        vars.outlet.vatNum
      )

      const payload: UpdateOutletRequest = {
        id: outletId,
        userId,
        outletCategoryId,
        routeId,
        rangeId,
        outletName,
        address1,
        address2,
        address3,
        ownerName,
        mobileNo,
        latitude,
        longitude,
        displayOrder,
        openTime,
        closeTime,
        isNew: resolveBoolean(outletDetails.isNew, vars.outlet.isNew),
        isApproved: vars.nextApproved,
        isClose: resolveBoolean(outletDetails.isClose, vars.outlet.isClose),
        vatNum: vatNumValue ? toStringValue(vatNumValue) : undefined,
        outletSequence,
      }

      const formData = new FormData()
      ;(Object.entries(payload) as Array<
        [keyof UpdateOutletRequest, UpdateOutletRequest[keyof UpdateOutletRequest]]
      >).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        formData.append(String(key), String(value))
      })

      return updateOutlet(formData)
    },
    onSuccess: () => {
      toast.success('Outlet approval updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-demarcation', 'outlets'] })
    },
    onError: (error) => {
      toast.error(
        (error as Error)?.message ?? 'Failed to update outlet approval'
      )
    },
  })

  const handleToggleApprove = useCallback(
    (record: OutletRecord, nextApproved: boolean) => {
      approveMutation.mutate({ outlet: record, nextApproved })
    },
    [approveMutation]
  )

  const outletRows = channelId ? rows : []
  const uniqueOutletRows = useMemo(
    () => dedupeOutlets(outletRows),
    [outletRows]
  )

  const columns = useMemo<ColumnDef<OutletRecord>[]>(
    () =>
      createOutletColumns({
        onEdit: (record) => setEditOutlet(record),
        onToggleApprove: handleToggleApprove,
      }),
    [handleToggleApprove]
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
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const categoryFilterOptions = useMemo(() => {
    const values = new Map<string, string>()
    filteredData.forEach((row) => {
      const value = pickFirstValue(row, [
        'outletCategoryName',
        'outletCategory',
        'category',
      ])
      if (value === null || value === undefined || value === '') return
      const label = String(value)
      if (!values.has(label)) values.set(label, label)
    })
    return Array.from(values.keys()).map((label) => ({
      label,
      value: label,
    }))
  }, [filteredData])

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
          const nextChannelId = filters.channelId?.trim() ?? ''
          const nextSubChannelId = filters.subChannelId?.trim() ?? '0'
          const nextAreaId = filters.areaId?.trim() ?? '0'
          const nextTerritoryId = filters.territoryId?.trim() ?? '0'
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
          setChannelId('')
          setSubChannelId('0')
          setAreaId('0')
          setTerritoryId('0')
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
                  },
                  {
                    columnId: 'approved',
                    title: 'Approved',
                    options: approvedFilterOptions,
                  },
                  {
                    columnId: 'status',
                    title: 'Status',
                    options: statusFilterOptions,
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
                          className='text-muted-foreground bg-gray-100 px-3 text-xs font-semibold tracking-wide uppercase dark:bg-gray-900'
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
                          <TableCell key={cell.id} className='px-3 py-2'>
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
        open={Boolean(editOutlet)}
        onOpenChange={(open) => {
          if (!open) setEditOutlet(null)
        }}
        title='Edit Outlet'
        width='full'
      >
        {editOutlet ? (
          <EditOutletForm
            outlet={editOutlet}
            onSubmit={() => setEditOutlet(null)}
          />
        ) : null}
      </FullWidthDialog>
    </div>
  )
}
