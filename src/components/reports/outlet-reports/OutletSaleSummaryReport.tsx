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
import { getOutletSummeryReports } from '@/services/reports/outletReportsApi'
import { formatDate } from '@/lib/format-date'
import { formatLocalDate } from '@/lib/local-date'
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'
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
import OutletSaleFilter, {
  type NotVisitedOutletFilters,
} from '@/components/reports/outlet-reports/OutletSaleFilter'

const formatHeader = (key: string) => {
  const withSpaces = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const isDateKey = (key: string) => /date/i.test(key)
const isValueKey = (key: string) => /(value|price|amount|discount)/i.test(key)
const isQuantityKey = (key: string) => /(qty|quantity|count)/i.test(key)
const isRightAlignedKey = (key: string) =>
  isValueKey(key) || isQuantityKey(key)
const isCenterAlignedKey = (key: string) => isDateKey(key)

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
  if (isCenterAlignedKey(key)) return 'justify-center text-center'
  if (isRightAlignedKey(key)) return 'justify-end text-right'
  return ''
}

const getCellAlignmentClassName = (key: string) => {
  if (isCenterAlignedKey(key)) return 'text-center'
  if (isRightAlignedKey(key)) return 'text-right'
  return ''
}

type ToolbarFilterOption = {
  columnId?: string
  title: string
  options: { label: string; value: string }[]
}

const hasColumnId = (
  filter: ToolbarFilterOption
): filter is Omit<ToolbarFilterOption, 'columnId'> & { columnId: string } =>
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

const hiddenColumnKeys = new Set(
  [
    'channelId',
    'subChannelId',
    'regionId',
    'areaId',
    'territoryId',
    'routeId',
    'outletCategoryId',
    'outletId',
  ].map((key) => normalizeKey(key))
)

let cachedFilters: NotVisitedOutletFilters | null = null
let cachedGlobalFilter = ''

const OutletSaleSummaryReport = () => {
  const [filters, setFilters] = useState<NotVisitedOutletFilters | null>(
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
    if (!filters?.subChannelId) return null
    return {
      subChannelId: filters.subChannelId,
      areaId: filters.areaId ?? 0,
      territoryId: filters.territoryId ?? 0,
      routeId: filters.routeId ?? 0,
      outletCategoryId: filters.outletCategoryId ?? 0,
      invoiceType: filters.invoiceType ?? '',
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
    }
  }, [filters, todayIso])

  const canFetch = Boolean(queryParams)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'outlet-sale-summary', queryParams],
    enabled: canFetch,
    queryFn: () => getOutletSummeryReports(queryParams!),
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
  const filterColumnKeys = useMemo(
    () => ({
      outletCategoryName: findColumnKey(columnKeys, [
        'outletcategoryname',
        'outletcategory',
        'categoryname',
        'category',
      ]),
    }),
    [columnKeys]
  )
  const filterOptions = useMemo(() => {
    const buildOptions = (columnKey?: string) =>
      columnKey ? buildFacetOptions(rows.map((row) => row[columnKey])) : []
    return [
      {
        columnId: filterColumnKeys.outletCategoryName,
        title: 'Outlet Category Name',
        options: buildOptions(filterColumnKeys.outletCategoryName),
      },
    ].filter(hasColumnId)
  }, [rows, filterColumnKeys.outletCategoryName])

  const visibleKeys = useMemo(
    () => columnKeys.filter((key) => !hiddenColumnKeys.has(normalizeKey(key))),
    [columnKeys]
  )

  const exportColumns = useMemo<ExcelExportColumn<Record<string, unknown>>[]>(
    () =>
      visibleKeys.map((key) => ({
        header: formatHeader(key),
        accessor: (row) => formatValue(key, row[key]),
      })),
    [visibleKeys]
  )

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      visibleKeys.map((key) => ({
        accessorKey: key,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={formatHeader(key)}
            className={getHeaderAlignmentClassName(key)}
          />
        ),
        cell: ({ row }) => {
          const value = row.getValue(key)
          return (
            <span className='block truncate'>
              {formatValue(key, value)}
            </span>
          )
        },
      })),
    [visibleKeys]
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
  const tableState = table.getState()
  const exportRows = useMemo(
    () => table.getSortedRowModel().rows.map((row) => row.original),
    [table, rows, globalFilter, tableState.columnFilters, tableState.sorting]
  )

  return (
    <div className='space-y-3'>
      <Card className='rounded-md'>
        <CardContent>
          <OutletSaleFilter
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
              description='Select sub channel to load the report.'
            />
          </CardContent>
        ) : (
          <>
            <CardHeader className='flex items-center justify-between gap-2'>
              <CardTitle className='text-base font-semibold'>
                Outlet Sale Summary Report{' '}
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
                    filters={filterOptions}
                    rightContent={
                      <ExcelExportButton
                        size='sm'
                        variant='outline'
                        data={exportRows}
                        columns={exportColumns}
                        fileName='outlet-sale-summary-report'
                        worksheetName='Outlet Sale Summary Report'
                        disabled={!exportRows.length}
                      />
                    }
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
                              'text-muted-foreground bg-gray-100 px-3 text-xs font-semibold tracking-wide uppercase dark:bg-gray-900',
                              getCellAlignmentClassName(
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
                                )
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

export default OutletSaleSummaryReport
