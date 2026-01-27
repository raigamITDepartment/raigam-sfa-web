import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import type { ApiResponse } from '@/types/common'
import {
  getAttendanceReport,
  getAttendanceStatusList,
  type AttendanceStatusItem,
} from '@/services/reports/otherReportsApi'
import { CommonAlert } from '@/components/common-alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { CommonDialog } from '@/components/common-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TimeAttendanceFilter, {
  type TimeAttendanceFilters,
} from '@/components/time-attendance/Filter'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format-date'
import { formatPrice } from '@/lib/format-price'

type AttendanceReportRow = {
  userId?: number | string | null
  range_id?: number | string | null
  range_name?: string | null
  areaId?: number | string | null
  areaName?: string | null
  territoryId?: number | string | null
  territoryName?: string | null
  salesRepId?: number | string | null
  salesRepName?: string | null
  workingDate?: string | null
  isWorkingDay?: boolean | null
  checkinTime?: string | null
  checkInDistance?: number | null
  firstPc?: string | null
  firstUpc?: string | null
  firstMadeCall?: string | null
  firstMadeCallTimeGap?: string | null
  lastPc?: string | null
  lastUpc?: string | null
  lastMadeCall?: string | null
  lastMadeCallTimeGap?: string | null
  checkoutTime?: string | null
  checkOutDistance?: number | null
  pcCount?: number | null
  madeCallCount?: number | null
  totalBValue?: number | null
  morningStatusId?: number | string | null
  morningStatus?: string | null
  eveningStatusId?: number | string | null
  eveningStatus?: string | null
  aseComments?: string | null
  rsmComments?: string | null
  agency_lat?: number | null
  agency_lon?: number | null
  checkin_lat?: number | null
  checkin_lon?: number | null
  checkout_lat?: number | null
  checkout_lon?: number | null
  upcCount?: number | null
}

const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '—'
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('en-LK')
    : '—'
}

const formatDecimal = (value?: number | string | null, fractionDigits = 2) => {
  if (value === null || value === undefined || value === '') return '—'
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return '—'
  return parsed.toLocaleString('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}

const formatText = (value?: string | number | null) =>
  value === null || value === undefined || value === '' ? '—' : String(value)

const formatTime = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (match) {
      const hours = Number(match[1])
      const minutes = Number(match[2])
      if (
        Number.isFinite(hours) &&
        Number.isFinite(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        const period = hours >= 12 ? 'PM' : 'AM'
        const hour12 = hours % 12 || 12
        return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(
          2,
          '0'
        )} ${period}`
      }
    }
  }
  return formatDate(value, 'hh:mm a')
}

const parseTimeToMinutes = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.getHours() * 60 + date.getMinutes()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const ampmMatch = trimmed.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/
    )
    if (ampmMatch) {
      const hoursRaw = Number(ampmMatch[1])
      const minutes = Number(ampmMatch[2])
      if (
        Number.isNaN(hoursRaw) ||
        Number.isNaN(minutes) ||
        hoursRaw < 1 ||
        hoursRaw > 12 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null
      }
      const isPm = ampmMatch[4].toLowerCase() === 'pm'
      const hours = (hoursRaw % 12) + (isPm ? 12 : 0)
      return hours * 60 + minutes
    }
    const plainMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (plainMatch) {
      const hours = Number(plainMatch[1])
      const minutes = Number(plainMatch[2])
      if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null
      }
      return hours * 60 + minutes
    }
  }
  return null
}

type AttendanceColumnMeta = {
  className?: string
}

const FILTER_STORAGE_KEY = 'time-attendance-filters'

const readStoredFilters = (): TimeAttendanceFilters | undefined => {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as TimeAttendanceFilters
    return parsed ?? undefined
  } catch {
    return undefined
  }
}

const writeStoredFilters = (filters?: TimeAttendanceFilters | null) => {
  if (typeof window === 'undefined') return
  if (!filters) {
    window.localStorage.removeItem(FILTER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

export function TimeAttendance() {
  const [filters, setFilters] = useState<TimeAttendanceFilters | undefined>(
    () => readStoredFilters()
  )
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [timeNow, setTimeNow] = useState(() => new Date())
  const [statusForm, setStatusForm] = useState({
    morningStatusId: '',
    eveningStatusId: '',
    aseComments: '',
    rsmComments: '',
  })

  useEffect(() => {
    if (!statusDialogOpen) return
    setTimeNow(new Date())
    const timer = setInterval(() => setTimeNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [statusDialogOpen])
  const queryParams = useMemo(() => {
    if (!filters?.startDate || !filters?.endDate) return null
    return {
      areaId: filters.areaId ?? 0,
      rangeId: filters.rangeId ?? 0,
      territoryId: filters.territoryId ?? 0,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }
  }, [
    filters?.areaId,
    filters?.rangeId,
    filters?.territoryId,
    filters?.startDate,
    filters?.endDate,
  ])

  const {
    data: attendanceRows = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['time-attendance', 'report', queryParams],
    enabled: Boolean(queryParams),
    queryFn: async () => {
      const res = (await getAttendanceReport(
        queryParams!
      )) as ApiResponse<AttendanceReportRow[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: statusListResponse, isLoading: loadingStatusList } = useQuery({
    queryKey: ['time-attendance', 'status-list'],
    queryFn: getAttendanceStatusList,
    staleTime: 5 * 60 * 1000,
  })

  const statusOptions = useMemo<AttendanceStatusItem[]>(() => {
    return statusListResponse?.payload ?? []
  }, [statusListResponse])

  const canEditEveningStatus = useMemo(() => {
    const hours = timeNow.getHours()
    const minutes = timeNow.getMinutes()
    return hours > 12 || (hours === 12 && minutes >= 30)
  }, [timeNow])

  const uniqueAttendanceRows = useMemo(() => {
    const seen = new Set<string>()
    const result: AttendanceReportRow[] = []
    attendanceRows.forEach((row, index) => {
      const keyParts = [
        row.salesRepId ?? row.salesRepName ?? 'rep',
        row.workingDate ?? 'date',
        row.territoryId ?? row.territoryName ?? 'territory',
      ]
      const key = keyParts.map((part) => String(part)).join('|')
      if (seen.has(key)) return
      seen.add(key)
      result.push(row)
    })
    return result
  }, [attendanceRows])

  const isBusy = isLoading || isFetching
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const territoryFilterOptions = useMemo(() => {
    const values = new Map<string, string>()
    uniqueAttendanceRows.forEach((row) => {
      const raw = row.territoryName
      if (raw === null || raw === undefined) return
      const label = String(raw).trim()
      if (!label) return
      values.set(label, label)
    })
    return Array.from(values.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ label, value: label }))
  }, [attendanceRows])

  const salesRepFilterOptions = useMemo(() => {
    const values = new Map<string, string>()
    uniqueAttendanceRows.forEach((row) => {
      const raw = row.salesRepName
      if (raw === null || raw === undefined) return
      const label = String(raw).trim()
      if (!label) return
      values.set(label, label)
    })
    return Array.from(values.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ label, value: label }))
  }, [attendanceRows])

  const columns = useMemo<ColumnDef<AttendanceReportRow>[]>(() => {
    const multiValueFilter = (
      row: { getValue: (id: string) => unknown },
      columnId: string,
      filterValue: unknown
    ) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true
      const raw = row.getValue(columnId)
      const label = raw === null || raw === undefined ? '' : String(raw)
      return filterValue.includes(label)
    }

    const textColumn = (
      key: keyof AttendanceReportRow,
      title: string
    ): ColumnDef<AttendanceReportRow> => ({
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={title} />
      ),
      cell: ({ row }) => formatText(row.original[key]),
    })

    const centeredTextColumn = (
      key: keyof AttendanceReportRow,
      title: string,
      format: (value: AttendanceReportRow[keyof AttendanceReportRow]) => string = formatText
    ): ColumnDef<AttendanceReportRow> => ({
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={title}
          className='justify-center'
        />
      ),
      cell: ({ row }) => format(row.original[key]),
      meta: { className: 'text-center' } satisfies AttendanceColumnMeta,
    })

    const numberColumn = (
      key: keyof AttendanceReportRow,
      title: string,
      format: (value?: number | string | null) => string = formatNumber
    ): ColumnDef<AttendanceReportRow> => ({
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={title}
          className='justify-end'
        />
      ),
      cell: ({ row }) => format(row.original[key] as number | string | null),
      meta: { className: 'text-right tabular-nums' } satisfies AttendanceColumnMeta,
    })

    const centeredNumberColumn = (
      key: keyof AttendanceReportRow,
      title: string,
      format: (value?: number | string | null) => string = formatNumber
    ): ColumnDef<AttendanceReportRow> => ({
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={title}
          className='justify-center'
        />
      ),
      cell: ({ row }) => format(row.original[key] as number | string | null),
      meta: { className: 'text-center tabular-nums' } satisfies AttendanceColumnMeta,
    })

    return [
      {
        id: 'select',
        header: () => <div className='flex items-center justify-center' />,
        cell: ({ row }) => (
          <div className='flex items-center justify-center'>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                if (value) {
                  setRowSelection({ [row.id]: true })
                } else {
                  setRowSelection({})
                }
              }}
              aria-label='Select row'
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { className: 'w-12 text-center' } satisfies AttendanceColumnMeta,
      },
      {
        accessorKey: 'territoryName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Territory' />
        ),
        cell: ({ row }) => (
          <span className='pl-3'>{formatText(row.original.territoryName)}</span>
        ),
        filterFn: multiValueFilter,
      },
      {
        ...textColumn('salesRepName', 'Sales Rep'),
        filterFn: multiValueFilter,
      },
      {
        accessorKey: 'workingDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Date' />
        ),
        cell: ({ row }) => formatDate(row.original.workingDate ?? null),
      },
      {
        accessorKey: 'checkinTime',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Time Check In'
            className='justify-center'
          />
        ),
        cell: ({ row }) => formatTime(row.original.checkinTime ?? null),
        meta: { className: 'text-center' } satisfies AttendanceColumnMeta,
      },
      centeredNumberColumn(
        'checkInDistance',
        'Check In Distance (m)',
        formatDecimal
      ),
      centeredTextColumn('firstMadeCall', 'First Made Call Time', (value) =>
        formatTime(value as string | number | null)
      ),
      centeredTextColumn('firstPc', 'First PC Time', (value) =>
        formatTime(value as string | number | null)
      ),
      centeredTextColumn('firstMadeCallTimeGap', 'Time Gap'),
      centeredTextColumn('lastPc', 'Last PC Time', (value) =>
        formatTime(value as string | number | null)
      ),
      centeredTextColumn('lastMadeCall', 'Last Made Call Time', (value) =>
        formatTime(value as string | number | null)
      ),
      centeredTextColumn('checkoutTime', 'Time Check Out', (value) =>
        formatTime(value as string | number | null)
      ),
      centeredTextColumn('lastMadeCallTimeGap', 'Time Gap'),
      centeredNumberColumn(
        'checkOutDistance',
        'Check Out Distance (m)',
        formatDecimal
      ),
      centeredNumberColumn('pcCount', 'PC'),
      centeredNumberColumn('madeCallCount', 'Made Calls'),
      centeredNumberColumn('upcCount', 'UPC'),
      numberColumn(
        'totalBValue',
        'Total Booking Value',
        (value) => formatPrice(typeof value === 'number' ? value : Number(value))
      ),
      textColumn('morningStatus', 'Morning Status'),
      textColumn('eveningStatus', 'Evening Status'),
      textColumn('aseComments', 'ASE/ASM Comments'),
      textColumn('rsmComments', 'RSM Comments'),
    ]
  }, [])

  const table = useReactTable({
    data: queryParams ? uniqueAttendanceRows : [],
    columns,
    state: {
      globalFilter,
      pagination,
      columnVisibility,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    getRowId: (row, index) =>
      `${row.userId ?? row.salesRepId ?? row.territoryId ?? 'row'}-${row.workingDate ?? index}`,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    autoResetPageIndex: false,
  })

  const filteredRows = table.getFilteredRowModel().rows
  const filteredCount = filteredRows.length
  const totalCount = uniqueAttendanceRows.length
  const selectedCount = table.getSelectedRowModel().rows.length
  const exportRows = useMemo(
    () => table.getSortedRowModel().rows.map((row) => row.original),
    [table, attendanceRows, globalFilter, pagination, columnVisibility]
  )
  const exportColumns = useMemo<ExcelExportColumn<AttendanceReportRow>[]>(
    () => [
      {
        header: 'Territory',
        accessor: (row) => row.territoryName ?? '',
      },
      {
        header: 'Sales Rep',
        accessor: (row) => row.salesRepName ?? '',
      },
      {
        header: 'Date',
        accessor: (row) => formatDate(row.workingDate ?? null),
      },
      {
        header: 'Time Check In',
        accessor: (row) => formatTime(row.checkinTime ?? null),
      },
      {
        header: 'Check In Distance (m)',
        accessor: (row) => formatDecimal(row.checkInDistance),
      },
      {
        header: 'First Made Call Time',
        accessor: (row) => formatTime(row.firstMadeCall ?? null),
      },
      {
        header: 'First PC Time',
        accessor: (row) => formatTime(row.firstPc ?? null),
      },
      {
        header: 'Time Gap',
        accessor: (row) => row.firstMadeCallTimeGap ?? '',
      },
      {
        header: 'Last PC Time',
        accessor: (row) => formatTime(row.lastPc ?? null),
      },
      {
        header: 'Last Made Call Time',
        accessor: (row) => formatTime(row.lastMadeCall ?? null),
      },
      {
        header: 'Time Check Out',
        accessor: (row) => formatTime(row.checkoutTime ?? null),
      },
      {
        header: 'Time Gap',
        accessor: (row) => row.lastMadeCallTimeGap ?? '',
      },
      {
        header: 'Check Out Distance (m)',
        accessor: (row) => formatDecimal(row.checkOutDistance),
      },
      {
        header: 'PC',
        accessor: (row) => formatNumber(row.pcCount),
      },
      {
        header: 'Made Calls',
        accessor: (row) => formatNumber(row.madeCallCount),
      },
      {
        header: 'UPC',
        accessor: (row) => formatNumber(row.upcCount),
      },
      {
        header: 'Total Booking Value',
        accessor: (row) =>
          formatPrice(
            typeof row.totalBValue === 'number'
              ? row.totalBValue
              : Number(row.totalBValue)
          ),
      },
      {
        header: 'Morning Status',
        accessor: (row) => row.morningStatus ?? '',
      },
      {
        header: 'Evening Status',
        accessor: (row) => row.eveningStatus ?? '',
      },
      {
        header: 'ASE/ASM Comments',
        accessor: (row) => row.aseComments ?? '',
      },
      {
        header: 'RSM Comments',
        accessor: (row) => row.rsmComments ?? '',
      },
    ],
    []
  )

  const getRowToneClass = (row: AttendanceReportRow) => {
    const rawValue = row.checkinTime ?? null
    const minutes = parseTimeToMinutes(rawValue)
    const isMissing = rawValue === null || rawValue === undefined || rawValue === ''
    if (isMissing) {
      return [
        'odd:!bg-rose-50 even:!bg-rose-50',
        'hover:!bg-rose-100 dark:odd:!bg-rose-950/30 dark:even:!bg-rose-950/30 dark:hover:!bg-rose-950/40',
        'data-[state=selected]:!bg-rose-100 dark:data-[state=selected]:!bg-rose-950/40',
      ].join(' ')
    }
    if (minutes !== null && minutes > 8 * 60) {
      return [
        'odd:!bg-yellow-50 even:!bg-yellow-50',
        'hover:!bg-yellow-100 dark:odd:!bg-yellow-950/30 dark:even:!bg-yellow-950/30 dark:hover:!bg-yellow-950/40',
        'data-[state=selected]:!bg-yellow-100 dark:data-[state=selected]:!bg-yellow-950/40',
      ].join(' ')
    }
    return ''
  }

  return (
    <div className='space-y-6'>
      <TimeAttendanceFilter
        initialValues={filters}
        onApply={(next) => {
          setFilters(next)
          writeStoredFilters(next)
        }}
        onReset={() => {
          setFilters(undefined)
          writeStoredFilters(null)
        }}
      />
      {!queryParams && (
        <CommonAlert
          variant='warning'
          title='Apply filters'
          description='Select area, range, territory, and date range to load attendance data.'
        />
      )}
      {queryParams ? (
        <Card>
          <CardHeader className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold'>
                Attendance Report{' '}
                <CountBadge value={`${filteredCount}/${totalCount}`} />
              </CardTitle>
              <CardDescription>
                Attendance data for the selected filters.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            <DataTableToolbar
              table={table}
              searchPlaceholder='Search attendance...'
              filters={[
                {
                  columnId: 'territoryName',
                  title: 'Territory',
                  options: territoryFilterOptions,
                },
                {
                  columnId: 'salesRepName',
                  title: 'Sales Rep',
                  options: salesRepFilterOptions,
                },
              ]}
              rightContent={
                <ExcelExportButton
                  data={exportRows}
                  columns={exportColumns}
                  fileName='time-attendance-report'
                  variant='outline'
                  className='h-8 gap-2 rounded-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                />
              }
              rightContentAfterViewOptions={
                <Button
                  variant='default'
                  className='h-8 gap-2 rounded-sm'
                  disabled={selectedCount === 0}
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Add Status
                </Button>
              }
            />
            <div className='rounded-md border'>
              <Table className='text-xs'>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef
                          .meta as AttendanceColumnMeta | undefined
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              'text-muted-foreground bg-gray-100 px-3 text-xs font-semibold tracking-wide uppercase dark:bg-gray-900',
                              meta?.className
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isBusy ? (
                    <TableLoadingRows columns={columns.length} />
                  ) : isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='text-destructive h-20 text-center'
                      >
                        {error instanceof Error
                          ? error.message
                          : 'Unable to load attendance report.'}
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className={getRowToneClass(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef
                            .meta as AttendanceColumnMeta | undefined
                          return (
                            <TableCell
                              key={cell.id}
                              className={cn('px-3 py-2', meta?.className)}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='h-20 text-center text-slate-500'
                      >
                        No attendance data found for the selected filters.
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
      <CommonDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title='Add Status'
        description={
          selectedCount
            ? `You have selected ${selectedCount} row${selectedCount > 1 ? 's' : ''}.`
            : 'Select at least one row to add status.'
        }
        primaryAction={{
          label: 'Save',
          onClick: () => {
            setStatusDialogOpen(false)
          },
          disabled: selectedCount === 0,
        }}
        secondaryAction={{
          label: 'Cancel',
          variant: 'outline',
          onClick: () => setStatusDialogOpen(false),
        }}
        bodyClassName='space-y-4'
      >
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='ta-morning-status'>Morning Status</Label>
            <Select
              value={statusForm.morningStatusId}
              onValueChange={(value) =>
                setStatusForm((prev) => ({
                  ...prev,
                  morningStatusId: value,
                }))
              }
              disabled={loadingStatusList}
            >
              <SelectTrigger id='ta-morning-status' className='w-full'>
                <SelectValue placeholder='Select morning status' />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.workingDayType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='ta-evening-status'>Evening Status</Label>
            <Select
              value={statusForm.eveningStatusId}
              onValueChange={(value) =>
                setStatusForm((prev) => ({
                  ...prev,
                  eveningStatusId: value,
                }))
              }
              disabled={loadingStatusList || !canEditEveningStatus}
            >
              <SelectTrigger id='ta-evening-status' className='w-full'>
                <SelectValue placeholder='Select evening status' />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.workingDayType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='ta-ase-comments'>ASE/ASM Comments</Label>
          <Textarea
            id='ta-ase-comments'
            value={statusForm.aseComments}
            onChange={(event) =>
              setStatusForm((prev) => ({
                ...prev,
                aseComments: event.target.value,
              }))
            }
            placeholder='Add ASE/ASM comments'
            rows={3}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='ta-rsm-comments'>RSM Comments</Label>
          <Textarea
            id='ta-rsm-comments'
            value={statusForm.rsmComments}
            onChange={(event) =>
              setStatusForm((prev) => ({
                ...prev,
                rsmComments: event.target.value,
              }))
            }
            placeholder='Add RSM comments'
            rows={3}
          />
        </div>
      </CommonDialog>
    </div>
  )
}
