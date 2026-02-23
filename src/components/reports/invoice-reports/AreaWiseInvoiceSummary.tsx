import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { getAreaWiseSalesSummery } from '@/services/reports/invoiceReports'
import { formatDate } from '@/lib/format-date'
import { formatLocalDate } from '@/lib/local-date'
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommonAlert } from '@/components/common-alert'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import AreaInvoiceReportFilter, {
  type AreaInvoiceReportFilters,
} from '@/components/reports/invoice-reports/ArearFilter'

const SHORT_HEADER_MAP: Record<string, string> = {
  territoryid: 'Terr ID',
  territoryname: 'Territory',
  workingdayscount: 'Work Days',
  totalbookvalue: 'Book Val',
  totalactualvalue: 'Actual Val',
  targetvalue: 'Target Val',
  targetpccount: 'Target PC',
  achievementpercentage: 'Achv %',
  averageactualvalue: 'Avg Actual',
  bookingpccount: 'Book PC',
  actualpccount: 'Actual PC',
  cancelpccount: 'Cancel PC',
  averagepccount: 'Avg PC',
}

const formatHeader = (key: string) => {
  const withSpaces = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const formatTableHeader = (key: string) =>
  SHORT_HEADER_MAP[normalizeKey(key)] ?? formatHeader(key)

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const isDateKey = (key: string) => /date/i.test(key)
const isValueKey = (key: string) => /(value|price|amount|discount)/i.test(key)
const isQuantityKey = (key: string) => /(qty|quantity|count)/i.test(key)
const isRightAlignedKey = (key: string) =>
  isValueKey(key) || isQuantityKey(key)
const isCenterAlignedKey = (key: string) => isDateKey(key)
const STATUS_COLUMN_ID = 'statusBadge'

const parseNumberValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const formatValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (isDateKey(key)) return formatDate(String(value))
  const numericValue = parseNumberValue(value)
  if (numericValue !== null) {
    if (isValueKey(key)) return formatPrice(numericValue)
    if (isQuantityKey(key)) return String(Math.trunc(numericValue))
    return String(numericValue)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getHeaderAlignmentClassName = (key: string) => {
  if (key === STATUS_COLUMN_ID) return 'justify-center text-center'
  if (isCenterAlignedKey(key)) return 'justify-center text-center'
  if (isRightAlignedKey(key)) return 'justify-end text-right'
  return ''
}

const getCellAlignmentClassName = (key: string) => {
  if (key === STATUS_COLUMN_ID) return 'text-center'
  if (isCenterAlignedKey(key)) return 'text-center'
  if (isRightAlignedKey(key)) return 'text-right'
  return ''
}

type ToolbarFilterOption = {
  columnId?: string
  title: string
  showCountBadge?: boolean
  options: { label: string; value: string }[]
}

const hasColumnId = <T extends ToolbarFilterOption>(
  filter: T
): filter is T & { columnId: string } =>
  Boolean(filter.columnId && filter.options.length > 0)

const buildFacetOptions = (values: unknown[]) => {
  const normalized = values
    .map((value) =>
      value === null || value === undefined ? '' : String(value)
    )
    .map((value) => value.trim())
    .filter((value) => value !== '')

  return Array.from(new Set(normalized))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((value) => ({
      label: value,
      value,
    }))
}

const findColumnKey = (keys: string[], candidates: string[]) =>
  keys.find((key) => candidates.includes(normalizeKey(key)))

const toBool = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
  return false
}

let cachedFilters: AreaInvoiceReportFilters | null = null
let cachedGlobalFilter = ''

const AreaWiseInvoiceSummary = () => {
  const [filters, setFilters] = useState<AreaInvoiceReportFilters | null>(
    () => cachedFilters
  )
  const [globalFilter, setGlobalFilter] = useState(() => cachedGlobalFilter)
  const todayIso = useMemo(() => formatLocalDate(new Date()), [])

  useEffect(() => {
    cachedFilters = filters
  }, [filters])

  useEffect(() => {
    cachedGlobalFilter = globalFilter
  }, [globalFilter])

  const queryParams = useMemo(() => {
    if (!filters?.areaId) return null
    return {
      areaId: filters.areaId,
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
      invoiceType: filters.invoiceType ?? '',
    }
  }, [filters, todayIso])

  const canFetch = Boolean(queryParams)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'area-wise-invoice-summary', queryParams],
    enabled: canFetch,
    queryFn: () => getAreaWiseSalesSummery(queryParams!),
  })

  const rows = useMemo(() => {
    const payload = (data as { payload?: unknown })?.payload
    return Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : []
  }, [data])

  const columnKeys = useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows]
  )
  const statusKeyMap = useMemo(
    () => ({
      isBook: findColumnKey(columnKeys, ['isbook']),
      isActual: findColumnKey(columnKeys, ['isactual']),
    }),
    [columnKeys]
  )
  const hasStatusColumn = Boolean(statusKeyMap.isBook || statusKeyMap.isActual)
  const displayKeys = useMemo(() => {
    if (!hasStatusColumn) return columnKeys
    const next = [...columnKeys]
    const insertAt = Math.min(2, next.length)
    next.splice(insertAt, 0, STATUS_COLUMN_ID)
    return next
  }, [columnKeys, hasStatusColumn])
  const getStatusLabel = (row: Record<string, unknown>) => {
    const isBook = statusKeyMap.isBook
      ? toBool(row[statusKeyMap.isBook])
      : false
    const isActual = statusKeyMap.isActual
      ? toBool(row[statusKeyMap.isActual])
      : false
    if (isActual) return 'Actual'
    if (isBook) return 'Booking'
    return '-'
  }
  const exportColumns = useMemo<ExcelExportColumn<Record<string, unknown>>[]>(
    () =>
      displayKeys.map((key) =>
        key === STATUS_COLUMN_ID
          ? {
              header: 'Status',
              accessor: (row) => getStatusLabel(row),
            }
          : {
              header: formatHeader(key),
              accessor: (row) => formatValue(key, row[key]),
            }
      ),
    [displayKeys, statusKeyMap]
  )
  const filterColumnKeys = useMemo(
    () => ({
      territoryName: findColumnKey(columnKeys, ['territoryname', 'territory']),
    }),
    [columnKeys]
  )
  const filterOptions = useMemo(() => {
    const buildOptions = (columnKey?: string) =>
      columnKey ? buildFacetOptions(rows.map((row) => row[columnKey])) : []
    return [
      {
        columnId: filterColumnKeys.territoryName,
        title: 'Territory Name',
        options: buildOptions(filterColumnKeys.territoryName),
      },
    ].filter(hasColumnId)
  }, [rows, filterColumnKeys.territoryName])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      displayKeys.map((key) =>
        key === STATUS_COLUMN_ID
          ? {
              id: STATUS_COLUMN_ID,
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title='Status'
                  className='justify-center text-center'
                />
              ),
              cell: ({ row }) => {
                const label = getStatusLabel(row.original)
                if (label === '-') {
                  return <span className='text-muted-foreground'>-</span>
                }
                const isActual = label === 'Actual'
                return (
                  <div className='flex justify-center'>
                    <Badge
                      variant='secondary'
                      className={
                        isActual
                          ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
                          : 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100'
                      }
                    >
                      {label}
                    </Badge>
                  </div>
                )
              },
              enableSorting: false,
            }
          : {
              accessorKey: key,
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={formatTableHeader(key)}
                  tooltip={formatHeader(key)}
                  className={getHeaderAlignmentClassName(key)}
                />
              ),
              cell: ({ row }) => {
                const value = row.getValue(key)
                if (normalizeKey(key) === 'territoryid') {
                  return (
                    <span className='block truncate pl-3'>
                      {formatValue(key, value)}
                    </span>
                  )
                }
                return (
                  <span className='block truncate'>
                    {formatValue(key, value)}
                  </span>
                )
              },
            }
      ),
    [displayKeys, statusKeyMap]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    autoResetPageIndex: false,
  })

  const showNoData =
    canFetch && !isLoading && !isError && table.getRowModel().rows.length === 0
  const filteredCount = table.getFilteredRowModel().rows.length
  const exportRows = table
    .getFilteredRowModel()
    .rows.map((row) => row.original)

  return (
    <div className='space-y-3'>
      <Card className='rounded-md'>
        <CardContent>
          <AreaInvoiceReportFilter
            initialValues={filters ?? undefined}
            onApply={(next) => setFilters(next)}
            onReset={() => {
              setFilters(null)
              setGlobalFilter('')
            }}
          />
        </CardContent>
      </Card>

      <Card>
        {!canFetch ? (
          <CardContent>
            <CommonAlert
              variant='info'
              title='Apply filters'
              description='Select area to load the report.'
            />
          </CardContent>
        ) : (
          <>
            <CardHeader className='flex items-center justify-between gap-2'>
              <CardTitle className='text-base font-semibold'>
                Area Wise Invoice Summary{' '}
                <CountBadge value={`${filteredCount}/${rows.length}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {isError ? (
                <CommonAlert
                  variant='error'
                  title='Failed to load report'
                  description={
                    error instanceof Error
                      ? error.message
                      : 'Unknown error occurred'
                  }
                />
              ) : null}
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='w-full'>
                  <DataTableToolbar
                    table={table}
                    searchPlaceholder='Search...'
                    rightContent={
                      <ExcelExportButton
                        size='sm'
                        variant='outline'
                        data={exportRows}
                        columns={exportColumns}
                        fileName='area-wise-invoice-summary'
                        worksheetName='Area Wise Invoice Summary'
                        disabled={!exportRows.length}
                      />
                    }
                    filters={filterOptions}
                  />
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
                            className={cn(
                              'text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase',
                              getHeaderAlignmentClassName(
                                String(header.column.id)
                              )
                            )}
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
                      <TableLoadingRows columns={columns.length || 1} />
                    ) : showNoData ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length || 1}
                          className='h-20 text-center text-slate-500'
                        >
                          No data for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                'px-3 py-2',
                                getCellAlignmentClassName(
                                  String(cell.column.id)
                                ),
                                normalizeKey(String(cell.column.id)) ===
                                  'territoryid' && 'pl-3'
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={table} />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

export default AreaWiseInvoiceSummary
