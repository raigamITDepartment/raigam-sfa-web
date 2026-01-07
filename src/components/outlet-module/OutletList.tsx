import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getAllOutletsByChannelId } from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type { OutletRecord } from '@/types/outlet'
import { createOutletColumns } from '@/components/outlet-module/outlet-list-columns'
import { createOutletExportColumns } from '@/components/outlet-module/outlet-list-export'
import {
  buildFacetOptions,
  formatRangeLabel,
  parseCreatedDate,
  pickFirstValue,
} from '@/components/outlet-module/outlet-list-utils'

const FILTER_STORAGE_KEY = 'outlet-list-filters'

type OutletFilterState = {
  channelId?: string
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

export const OutletList = () => {
  const storedFilters = readStoredFilters()
  const storedChannelId = storedFilters.channelId?.trim() ?? ''
  const [channelId, setChannelId] = useState<string>(storedChannelId)
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
      'by-channel',
      channelId,
    ],
    enabled: Boolean(channelId),
    queryFn: async () => {
      const res = (await getAllOutletsByChannelId(channelId)) as ApiResponse<
        OutletRecord[]
      >
      return res.payload ?? []
    },
  })

  const outletRows = channelId ? rows : []

  const columns = useMemo<ColumnDef<OutletRecord>[]>(
    () =>
      createOutletColumns({
        onEdit: (record) => setEditOutlet(record),
      }),
    []
  )

  const filteredData = useMemo(() => {
    if (!createdRange?.from) {
      return outletRows
    }
    if (!createdRange.to) {
      const target = new Date(createdRange.from)
      target.setHours(0, 0, 0, 0)
      const end = new Date(createdRange.from)
      end.setHours(23, 59, 59, 999)
      return outletRows.filter((row) => {
        const created = parseCreatedDate(row.created)
        if (!created) return false
        return created >= target && created <= end
      })
    }
    const from = createdRange.from
    const to = createdRange.to
    if (!from || !to) return outletRows
    return outletRows.filter((row) => {
      const created = parseCreatedDate(row.created)
      if (!created) return false
      const start = new Date(from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      return created >= start && created <= end
    })
  }, [outletRows, createdRange])

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

  const areaFilterOptions = useMemo(
    () =>
      buildFacetOptions(
        filteredData.map((row) =>
          pickFirstValue(row, ['areaName', 'rangeName', 'range'])
        )
      ),
    [filteredData]
  )

  const routeFilterOptions = useMemo(
    () => buildFacetOptions(filteredData.map((row) => row.routeName)),
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
          const nextChannelId = filters.channelId?.trim() ?? ''
          if (!nextChannelId) {
            setApplyError(true)
            return
          }
          setApplyError(false)
          writeStoredFilters({ channelId: nextChannelId })
          setChannelId(nextChannelId)
        }}
        onReset={() => {
          setApplyError(false)
          writeStoredFilters(null)
          setChannelId('')
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
              <CountBadge value={`${filteredCount}/${outletRows.length}`} />
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
                    columnId: 'areaName',
                    title: 'Area',
                    options: areaFilterOptions,
                  },
                  {
                    columnId: 'route',
                    title: 'Route',
                    options: routeFilterOptions,
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
