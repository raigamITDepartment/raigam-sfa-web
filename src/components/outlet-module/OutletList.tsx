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
import { format, isValid, parse } from 'date-fns'
import { OutletFilter } from '@/components/outlet-module/Filter'
import { TableLoadingRows } from '@/components/data-table'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountBadge } from '@/components/ui/count-badge'
import { CommonAlert } from '@/components/common-alert'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import FullWidthDialog from '@/components/FullWidthDialog'
import { EditOutletForm } from '@/components/outlet-module/EditOutletForm'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getAllOutletsByChannelId } from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type { Id } from '@/types/common'

type OutletRecord = {
  id?: Id
  name?: string
  outletId?: Id
  outletCode?: string
  outletCategoryId?: Id
  uniqueCode?: string
  outletName?: string
  outletCategory?: string
  outletCategoryName?: string
  category?: string
  agencyCode?: number | string
  routeId?: Id
  routeCode?: number | string
  shopCode?: number | string
  channelName?: string
  areaName?: string
  routeName?: string
  rangeId?: Id
  range?: string
  rangeName?: string
  owner?: string
  ownerName?: string
  mobile?: string
  mobileNo?: string
  address1?: string
  address2?: string
  address3?: string
  openTime?: string
  closeTime?: string
  latitude?: number | string
  longitude?: number | string
  vatNum?: string
  approved?: boolean | string
  isApproved?: boolean
  status?: boolean | string
  isClose?: boolean
  isNew?: boolean
  displayOrder?: number
  outletSequence?: number | string
  created?: string
  imagePath?: string | null
}

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

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const pickFirstValue = <K extends keyof OutletRecord>(
  row: OutletRecord,
  keys: K[]
): OutletRecord[K] | undefined => {
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return undefined
}

const normalizeBool = (value: unknown) => {
  if (value === true || value === 'true' || value === 1 || value === '1')
    return true
  if (value === false || value === 'false' || value === 0 || value === '0')
    return false
  return Boolean(value)
}

const buildFacetOptions = (values: (string | undefined | null)[]) => {
  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value !== '')

  return Array.from(new Set(normalized)).map((value) => ({
    label: value,
    value,
  }))
}

const parseCreatedDate = (value: unknown) => {
  if (!value) return undefined
  if (value instanceof Date) return isValid(value) ? value : undefined
  if (typeof value === 'number') {
    const date = new Date(value)
    return isValid(date) ? date : undefined
  }
  const text = String(value).trim()
  if (!text) return undefined
  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm",
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'yyyy-MM-dd HH:mm:ss.SSS',
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
  ]
  for (const formatString of formats) {
    const parsed = parse(text, formatString, new Date())
    if (isValid(parsed)) return parsed
  }
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const direct = new Date(normalized)
  if (isValid(direct)) return direct
  if (text.length >= 10) {
    const dateOnly = text.slice(0, 10)
    for (const formatString of formats.slice(0, 4)) {
      const parsed = parse(dateOnly, formatString, new Date())
      if (isValid(parsed)) return parsed
    }
  }
  return undefined
}

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from) return 'Created Date Range'
  if (!range.to) return format(range.from, 'MMM d, yyyy')
  return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
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
    () => [
      {
        id: 'dealerCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Dealer Code' />
        ),
        cell: ({ row }) => {
          const { agencyCode, routeCode, shopCode } = row.original
          const parts = [agencyCode, routeCode, shopCode].map((value) =>
            value === null || value === undefined || value === ''
              ? '-'
              : String(value)
          )
          return formatValue(parts.join('/'))
        },
      },
      {
        id: 'name',
        accessorFn: (row) => pickFirstValue(row, ['outletName', 'name']),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) =>
          (
            <span className='capitalize'>
              {formatValue(
                pickFirstValue(row.original, ['outletName', 'name'])
              )}
            </span>
          ),
      },
      {
        id: 'created',
        accessorFn: (row) => row.created,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Created' />
        ),
        cell: ({ row }) => formatValue(row.getValue('created')),
      },
      {
        id: 'uniqueCode',
        accessorFn: (row) =>
          pickFirstValue(row, ['uniqueCode', 'outletCode', 'outletId', 'id']),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Unique Code' />
        ),
        cell: ({ row }) =>
          formatValue(
            pickFirstValue(row.original, [
              'uniqueCode',
              'outletCode',
              'outletId',
              'id',
            ])
          ),
      },
      {
        id: 'category',
        accessorFn: (row) =>
          pickFirstValue(row, [
            'outletCategoryName',
            'outletCategory',
            'category',
          ]),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Category' />
        ),
        cell: ({ row }) =>
          formatValue(
            pickFirstValue(row.original, [
              'outletCategoryName',
              'outletCategory',
              'category',
            ])
          ),
      },
      {
        id: 'channelName',
        accessorFn: (row) => row.channelName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel' />
        ),
        cell: ({ row }) => (
          <span className='capitalize'>
            {formatValue(row.original.channelName)}
          </span>
        ),
      },
      {
        id: 'areaName',
        accessorFn: (row) =>
          pickFirstValue(row, ['areaName', 'rangeName', 'range']),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Area' />
        ),
        cell: ({ row }) => (
          <span className='capitalize'>
            {formatValue(
              pickFirstValue(row.original, ['areaName', 'rangeName', 'range'])
            )}
          </span>
        ),
      },
      {
        id: 'route',
        accessorFn: (row) => row.routeName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Route' />
        ),
        cell: ({ row }) => (
          <span className='capitalize'>
            {formatValue(row.original.routeName)}
          </span>
        ),
      },
      {
        id: 'owner',
        accessorFn: (row) => pickFirstValue(row, ['ownerName', 'owner']),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Owner' />
        ),
        cell: ({ row }) => (
          <span className='capitalize'>
            {formatValue(
              pickFirstValue(row.original, ['ownerName', 'owner'])
            )}
          </span>
        ),
      },
      {
        id: 'mobile',
        accessorFn: (row) => pickFirstValue(row, ['mobileNo', 'mobile']),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Mobile' />
        ),
        cell: ({ row }) =>
          formatValue(pickFirstValue(row.original, ['mobileNo', 'mobile'])),
      },
      {
        id: 'approved',
        accessorFn: (row) =>
          typeof row.isApproved === 'boolean'
            ? row.isApproved
            : pickFirstValue(row, ['approved']),
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const normalized = String(normalizeBool(row.getValue(columnId)))
          return values.includes(normalized)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Approved' />
        ),
        cell: ({ row }) => {
          const isApproved =
            typeof row.original.isApproved === 'boolean'
              ? row.original.isApproved
              : normalizeBool(pickFirstValue(row.original, ['approved']))
          const classes = isApproved
            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
            : 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
          return (
            <div className='flex w-full justify-center'>
              <Badge variant='secondary' className={classes}>
                {isApproved ? 'Yes' : 'No'}
              </Badge>
            </div>
          )
        },
      },
      {
        id: 'status',
        accessorFn: (row) =>
          typeof row.isClose === 'boolean'
            ? !row.isClose
            : pickFirstValue(row, ['status']),
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const normalized = String(normalizeBool(row.getValue(columnId)))
          return values.includes(normalized)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const isActive =
            typeof row.original.isClose === 'boolean'
              ? !row.original.isClose
              : normalizeBool(pickFirstValue(row.original, ['status']))
          const classes = isActive
            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
            : 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
          return (
            <div className='flex w-full justify-center'>
              <Badge variant='secondary' className={classes}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => <div className='pr-2 text-end'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-2 pr-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  aria-label='Edit outlet'
                  onClick={() => setEditOutlet(row.original)}
                >
                  <Pencil className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
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
  const exportColumns = useMemo<ExcelExportColumn<OutletRecord>[]>(
    () => [
      {
        header: 'Name',
        accessor: (row) => pickFirstValue(row, ['outletName', 'name']),
      },
      {
        header: 'Created',
        accessor: (row) => row.created,
      },
      {
        header: 'Outlet Id',
        accessor: (row) => pickFirstValue(row, ['outletCode', 'outletId', 'id']),
      },
      {
        header: 'Category',
        accessor: (row) =>
          pickFirstValue(row, [
            'outletCategoryName',
            'outletCategory',
            'category',
          ]),
      },
      {
        header: 'Route',
        accessor: (row) => row.routeName,
      },
      {
        header: 'Owner',
        accessor: (row) => pickFirstValue(row, ['ownerName', 'owner']),
      },
      {
        header: 'Mobile',
        accessor: (row) => pickFirstValue(row, ['mobileNo', 'mobile']),
      },
      {
        header: 'Approved',
        accessor: (row) =>
          typeof row.isApproved === 'boolean'
            ? row.isApproved
            : normalizeBool(pickFirstValue(row, ['approved'])),
        formatter: (value) => (normalizeBool(value) ? 'Yes' : 'No'),
      },
      {
        header: 'Status',
        accessor: (row) =>
          typeof row.isClose === 'boolean'
            ? !row.isClose
            : normalizeBool(pickFirstValue(row, ['status'])),
        formatter: (value) => (normalizeBool(value) ? 'Active' : 'Inactive'),
      },
    ],
    []
  )

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
