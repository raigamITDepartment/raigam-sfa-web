import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { getSubTwoCategorySummary } from '@/services/reports/otherReportsApi'
import TerritoryWiseItemsFilter, {
  type TerritoryWiseItemsFilters,
} from '@/components/reports/item-reports/Filter'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import { CommonAlert } from '@/components/common-alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
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
import { formatPrice } from '@/lib/format-price'
import { cn } from '@/lib/utils'

const FILTER_STORAGE_KEY = 'sub-two-category-summary-report-filters'

const formatHeader = (key: string) => {
  const withSpaces = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const buildFacetOptions = (values: unknown[]) => {
  const normalized = values
    .map((value) => (value === null || value === undefined ? '' : String(value)))
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

type ToolbarFilterOption = {
  columnId?: string
  title: string
  options: { label: string; value: string }[]
}

const hasColumnId = (
  filter: ToolbarFilterOption
): filter is Omit<ToolbarFilterOption, 'columnId'> & { columnId: string } =>
  Boolean(filter.columnId && filter.options.length > 0)

const isFilterMatch = (rowValue: unknown, filterValue: unknown) => {
  const values = Array.isArray(filterValue)
    ? filterValue
    : filterValue
      ? [String(filterValue)]
      : []
  if (!values.length) return true
  if (rowValue === null || rowValue === undefined) return false
  return values.includes(String(rowValue))
}

const isTotalFinalValue = (key: string) =>
  normalizeKey(key) === 'totalfinalvalue'
const isSoldQty = (key: string) => normalizeKey(key) === 'soldqty'
const isTotalSoldValue = (key: string) =>
  normalizeKey(key) === 'totalsoldvalue'
const isTotalCancelQty = (key: string) =>
  normalizeKey(key) === 'totalcancelqty'
const isSubTwoCategoryIdKey = (key: string) =>
  [
    'subtwocatid',
    'subtwocategoryid',
    'sub2catid',
    'sub2categoryid',
  ].includes(normalizeKey(key))

const unitOfMeasureKeyList = [
  'unitofmeasure',
  'unitmeasure',
  'uom',
  'uomname',
]
const quantityNoDecimalKeyList = [
  'totalbookingqty',
  'totalcancelqty',
  'totalfreeqty',
  'totalreturnqty',
  'totalgoodreturnqty',
  'totalmarketreturnqty',
  'totalmarketreturnfreeqty',
]
const valueKeyList = [
  'totalbookingvalue',
  'totalsoldvalue',
  'totalcancelvalue',
  'totalfreevalue',
  'totalreturnvalue',
  'totalgoodreturnfreevalue',
  'totalmarketreturnvalue',
  'totalmarketretunvalue',
  'totalmarketreturnfreevalue',
  'totaldiscountvalue',
]

const isUnitOfMeasureKey = (key: string) =>
  unitOfMeasureKeyList.includes(normalizeKey(key))
const isQuantityNoDecimalKey = (key: string) =>
  quantityNoDecimalKeyList.includes(normalizeKey(key))
const isValueKey = (key: string) =>
  valueKeyList.includes(normalizeKey(key))
const isRightAlignedKey = (key: string) =>
  isQuantityNoDecimalKey(key) || isValueKey(key) || isSoldQty(key)

const getHeaderAlignmentClassName = (key: string) => {
  if (isUnitOfMeasureKey(key)) return 'justify-center text-center'
  if (isRightAlignedKey(key)) return 'justify-end text-right'
  return ''
}

const getCellAlignmentClassName = (key: string) => {
  if (isUnitOfMeasureKey(key)) return 'text-center'
  if (isRightAlignedKey(key)) return 'text-right'
  return ''
}

const orderColumnKeys = (keys: string[]) => {
  const filtered = keys.filter((key) => !isTotalFinalValue(key))
  const soldQtyKey = filtered.find(isSoldQty)
  const totalSoldValueKey = filtered.find(isTotalSoldValue)
  const hasReorderTargets = soldQtyKey || totalSoldValueKey
  if (!hasReorderTargets) return filtered

  const withoutTargets = filtered.filter(
    (key) => !isSoldQty(key) && !isTotalSoldValue(key)
  )
  const cancelIndex = withoutTargets.findIndex(isTotalCancelQty)
  if (cancelIndex === -1) return filtered

  const insertKeys = [soldQtyKey, totalSoldValueKey].filter(
    (value): value is string => Boolean(value)
  )
  withoutTargets.splice(cancelIndex, 0, ...insertKeys)
  return withoutTargets
}

const isPriceKey = (key: string) =>
  /(price|amount|value|total|cost|net|sales)/i.test(key)

const parseNumberValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
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
  const numericValue = parseNumberValue(value)
  if (numericValue !== null) {
    if (isQuantityNoDecimalKey(key)) return String(Math.trunc(numericValue))
    if (isValueKey(key) || isPriceKey(key)) return formatPrice(numericValue)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const readStoredFilters = (): TerritoryWiseItemsFilters | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TerritoryWiseItemsFilters
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const writeStoredFilters = (filters: TerritoryWiseItemsFilters | null) => {
  if (typeof window === 'undefined') return
  if (!filters) {
    window.localStorage.removeItem(FILTER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

const SubTwoCategorySummaryReport = () => {
  const [filters, setFilters] = useState<TerritoryWiseItemsFilters | null>(() =>
    readStoredFilters()
  )
  const [globalFilter, setGlobalFilter] = useState('')

  const todayIso = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  )
  const queryParams = useMemo(() => {
    if (!filters?.subChannelId) return null
    return {
      subChannelId: filters.subChannelId,
      areaId: filters.areaId ?? 0,
      territoryId: filters.territoryId ?? 0,
      routeId: filters.routeId ?? 0,
      outletId: filters.outletId ?? 0,
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
    }
  }, [filters, todayIso])
  const canFetch = Boolean(queryParams)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'sub-two-category-summary', queryParams],
    enabled: canFetch,
    queryFn: () => getSubTwoCategorySummary(queryParams!),
  })

  const rows = useMemo(() => {
    const payload = (data as { payload?: unknown })?.payload
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
  }, [data])

  const orderedKeys = useMemo(
    () => (rows.length ? orderColumnKeys(Object.keys(rows[0])) : []),
    [rows]
  )
  const exportColumns = useMemo<
    ExcelExportColumn<Record<string, unknown>>[]
  >(
    () =>
      orderedKeys.map((key) => ({
        header: formatHeader(key),
        accessor: (row) => formatValue(key, row[key]),
      })),
    [orderedKeys]
  )

  const columnKeys = useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows]
  )
  const filterColumnKeys = useMemo(
    () => ({
      unitOfMeasure: findColumnKey(columnKeys, [
        'unitofmeasure',
        'unitmeasure',
        'uom',
        'uomname',
      ]),
      subTwoCategory: findColumnKey(columnKeys, [
        'subtwocatname',
        'subtwocat',
        'subtwocategoryname',
        'subtwocategory',
        'sub2catname',
        'sub2cat',
        'sub2categoryname',
        'sub2category',
        'subcategory2name',
      ]),
      subOneCategory: findColumnKey(columnKeys, [
        'subonecatname',
        'subonecat',
        'subonecategoryname',
        'subonecategory',
        'sub1catname',
        'sub1cat',
        'sub1categoryname',
        'sub1category',
        'subcategory1name',
      ]),
      mainCategory: findColumnKey(columnKeys, [
        'maincatname',
        'maincat',
        'maincategoryname',
        'maincategory',
      ]),
    }),
    [columnKeys]
  )
  const filterOptions = useMemo(() => {
    const buildOptions = (columnKey?: string) =>
      columnKey ? buildFacetOptions(rows.map((row) => row[columnKey])) : []
    return [
      {
        columnId: filterColumnKeys.unitOfMeasure,
        title: 'Unit of Measure',
        options: buildOptions(filterColumnKeys.unitOfMeasure),
      },
      {
        columnId: filterColumnKeys.subTwoCategory,
        title: 'Sub Two Category',
        options: buildOptions(filterColumnKeys.subTwoCategory),
      },
      {
        columnId: filterColumnKeys.subOneCategory,
        title: 'Sub One Category',
        options: buildOptions(filterColumnKeys.subOneCategory),
      },
      {
        columnId: filterColumnKeys.mainCategory,
        title: 'Main Category',
        options: buildOptions(filterColumnKeys.mainCategory),
      },
    ].filter(hasColumnId)
  }, [
    rows,
    filterColumnKeys.unitOfMeasure,
    filterColumnKeys.subTwoCategory,
    filterColumnKeys.subOneCategory,
    filterColumnKeys.mainCategory,
  ])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!rows.length) return []
    return orderedKeys.map((key) => ({
      accessorKey: key,
      filterFn: (row, columnId, filterValue) =>
        isFilterMatch(row.getValue(columnId), filterValue),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={formatHeader(key)}
          className={getHeaderAlignmentClassName(key)}
        />
      ),
      cell: ({ row }) => (
        <span className='block truncate'>
          {formatValue(key, row.getValue(key))}
        </span>
      ),
    }))
  }, [rows, orderedKeys])

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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    autoResetPageIndex: false,
  })

  const tableState = table.getState()
  const exportRowsForExport = useMemo(
    () => table.getSortedRowModel().rows.map((row) => row.original),
    [table, rows, globalFilter, tableState.columnFilters, tableState.sorting]
  )

  const showNoData =
    canFetch && !isLoading && !isError && table.getRowModel().rows.length === 0
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className='space-y-3'>
      <Card className='rounded-md'>
        <CardContent>
          <TerritoryWiseItemsFilter
            initialValues={filters ?? undefined}
            onApply={(next) => {
              if (!next.subChannelId) {
                writeStoredFilters(null)
                setFilters(null)
                return
              }
              writeStoredFilters(next)
              setFilters(next)
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
              description='Select all filters to load the report.'
            />
          </CardContent>
        ) : (
          <>
            <CardHeader className='flex items-center justify-between gap-2'>
              <CardTitle className='text-base font-semibold'>
                Sub Two Category Summary Report{' '}
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
                    searchPlaceholder='Search report data...'
                    filters={filterOptions}
                    rightContent={
                      <ExcelExportButton
                        size='sm'
                        variant='outline'
                        className='gap-2'
                        data={exportRowsForExport}
                        columns={exportColumns}
                        fileName='sub-two-category-summary-report'
                        worksheetName='Sub Two Category Summary Report'
                      >
                        <Download className='size-4' aria-hidden='true' />
                        <span>Export Excel</span>
                      </ExcelExportButton>
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
                            getCellAlignmentClassName(String(header.column.id)),
                            isSubTwoCategoryIdKey(String(header.column.id)) &&
                              'pl-3'
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
                          {row.getVisibleCells().map((cell, cellIndex) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                'px-3 py-2',
                                getCellAlignmentClassName(String(cell.column.id)),
                                isSubTwoCategoryIdKey(String(cell.column.id)) &&
                                  'pl-3'
                              )}
                            >
                              <div className={cn(cellIndex === 0 && 'pl-3')}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
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

export default SubTwoCategorySummaryReport
