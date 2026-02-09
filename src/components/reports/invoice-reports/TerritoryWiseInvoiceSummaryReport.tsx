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
import { getInvoiceDetailsByStatus } from '@/services/reports/invoiceReports'
import type { InvoiceTypeParam } from '@/types/invoice'
import { formatDate } from '@/lib/format-date'
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
import InvoiceNumber from '@/components/InvoiceNumber'
import InvoiceReportFilter, {
  type InvoiceReportFilters,
} from '@/components/reports/invoice-reports/TerritoryFilter'

const formatHeader = (key: string) => {
  const withSpaces = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const isDateKey = (key: string) => /date/i.test(key)
const isInvoiceTypeKey = (key: string) => normalizeKey(key) === 'invoicetype'
const isValueKey = (key: string) => /(value|price|amount|discount)/i.test(key)
const isQuantityKey = (key: string) => /(qty|quantity|count)/i.test(key)
const isRightAlignedKey = (key: string) =>
  isValueKey(key) || isQuantityKey(key)
const isCenterAlignedKey = (key: string) =>
  isDateKey(key) || isInvoiceTypeKey(key)

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

const orderColumnKeys = (keys: string[]) => {
  const hidden = new Set([
    'territoryid',
    'id',
    'userid',
    'agencywarehouseid',
    'routeid',
    'rangeid',
    'outletid',
    'isreversed',
    'isprinted',
    'isbook',
    'isactual',
    'islatadelivery',
    'islatdelivery',
    'islateDelivery',
    'invlatedelivery',
    'invlatedeliveryby',
    'invactualby',
    'invreversedby',
    'invupdatedby',
    'invcancelledby',
    'isreversereqagent',
    'agentreqdate',
    'isreversereqrep',
    'repreqdate',
    'isactive',
    'reverseRemark',
    'cancelRemark',
    'invoiceDetailDTOList',
  ].map((key) => normalizeKey(key)))
  const visibleKeys = keys.filter((key) => !hidden.has(normalizeKey(key)))
  const preferred = [
    'invoiceNo',
    'invoiceType',
    'dateBook',
    'dateActual',
    'totalBookFinalValue',
    'totalActualValue',
    'totalDiscountValue',
    'totalCancelValue',
    'routeName',
    'outletName',
  ]
  const set = new Set(visibleKeys)
  const ordered = preferred.filter((key) => set.has(key))
  const rest = visibleKeys.filter((key) => !ordered.includes(key))
  return [...ordered, ...rest]
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

const isInvoiceNoKey = (key: string) => normalizeKey(key) === 'invoiceno'

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

let cachedFilters: InvoiceReportFilters | null = null
let cachedGlobalFilter = ''

const TerritoryWiseInvoiceSummaryReport = () => {
  const [filters, setFilters] = useState<InvoiceReportFilters | null>(
    () => cachedFilters
  )
  const [globalFilter, setGlobalFilter] = useState(() => cachedGlobalFilter)
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    cachedFilters = filters
  }, [filters])

  useEffect(() => {
    cachedGlobalFilter = globalFilter
  }, [globalFilter])

  const queryParams = useMemo(() => {
    if (!filters?.subChannelId) return null
    if (!filters.invoiceStatus) return null
    const invoiceTypeParam: InvoiceTypeParam = filters.invoiceType ?? ''
    return {
      territoryId: filters.territoryId ?? 0,
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
      invoiceType: invoiceTypeParam,
      invoiceStatus: filters.invoiceStatus,
    }
  }, [filters, todayIso])

  const canFetch = Boolean(queryParams)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'invoice-summary', queryParams],
    enabled: canFetch,
    queryFn: () => getInvoiceDetailsByStatus(queryParams!),
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
  const orderedKeys = useMemo(() => orderColumnKeys(columnKeys), [columnKeys])
  const exportColumns = useMemo<ExcelExportColumn<Record<string, unknown>>[]>(
    () =>
      orderedKeys.map((key) => ({
        header: formatHeader(key),
        accessor: (row) => formatValue(key, row[key]),
      })),
    [orderedKeys]
  )
  const filterColumnKeys = useMemo(
    () => ({
      routeName: findColumnKey(columnKeys, ['routename', 'route']),
      outletName: findColumnKey(columnKeys, ['outletname', 'outlet']),
      invoiceType: findColumnKey(columnKeys, ['invoicetype']),
    }),
    [columnKeys]
  )
  const filterOptions = useMemo(() => {
    const buildOptions = (columnKey?: string) =>
      columnKey ? buildFacetOptions(rows.map((row) => row[columnKey])) : []
    return [
      {
        columnId: filterColumnKeys.routeName,
        title: 'Route Name',
        options: buildOptions(filterColumnKeys.routeName),
      },
      {
        columnId: filterColumnKeys.outletName,
        title: 'Outlet Name',
        options: buildOptions(filterColumnKeys.outletName),
      },
      {
        columnId: filterColumnKeys.invoiceType,
        title: 'Invoice Type',
        options: buildOptions(filterColumnKeys.invoiceType),
      },
    ].filter(hasColumnId)
  }, [
    rows,
    filterColumnKeys.routeName,
    filterColumnKeys.outletName,
    filterColumnKeys.invoiceType,
  ])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      orderedKeys.map((key) => ({
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
          if (isInvoiceNoKey(key)) {
            return (
              <InvoiceNumber
                invoiceId={String(value ?? '')}
                className='pl-2 font-medium text-slate-900 dark:text-slate-50'
              />
            )
          }
          return (
            <span className='block truncate'>
              {formatValue(key, value)}
            </span>
          )
        },
      })),
    [orderedKeys]
  )

  const searchKey = useMemo(
    () => columnKeys.find((key) => isInvoiceNoKey(key)),
    [columnKeys]
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
          <InvoiceReportFilter
            initialValues={filters ?? undefined}
            onApply={(next) => setFilters(next)}
            onReset={() => setFilters(null)}
          />
        </CardContent>
      </Card>

      <Card>
        {!canFetch ? (
          <CardContent>
            <CommonAlert
              variant='info'
              title='Apply filters'
              description='Select sub channel and invoice status to load the report.'
            />
          </CardContent>
        ) : (
          <>
            <CardHeader className='flex items-center justify-between gap-2'>
              <CardTitle className='text-base font-semibold'>
                Territory Wise Invoice Summary{' '}
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
                    searchPlaceholder='Search invoices...'
                    searchKey={searchKey}
                    filters={filterOptions}
                    rightContent={
                      <ExcelExportButton
                        size='sm'
                        variant='outline'
                        data={exportRows}
                        columns={exportColumns}
                        fileName='territory-wise-invoice-summary'
                        worksheetName='Territory Wise Invoice Summary'
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
                              ),
                              isInvoiceNoKey(String(header.column.id)) && 'pl-3'
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

export default TerritoryWiseInvoiceSummaryReport

