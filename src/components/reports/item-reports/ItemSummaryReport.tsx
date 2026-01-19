import { useMemo, useState } from 'react'
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
import { getItemSummery } from '@/services/reports/otherReportsApi'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/format-price'

const formatHeader = (key: string) => {
  const withSpaces = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const isPriceKey = (key: string) =>
  /(price|amount|value|total|cost|net|sales)/i.test(key)

const formatValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number' && isPriceKey(key)) return formatPrice(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const ItemSummaryReport = () => {
  const [filters, setFilters] = useState<TerritoryWiseItemsFilters | null>(null)
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
    queryKey: ['reports', 'item-summary', queryParams],
    enabled: canFetch,
    queryFn: () => getItemSummery(queryParams!),
  })

  const rows = useMemo(() => {
    const payload = (data as { payload?: unknown })?.payload
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
  }, [data])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!rows.length) return []
    return Object.keys(rows[0]).map((key) => ({
      accessorKey: key,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={formatHeader(key)} />
      ),
      cell: ({ row }) => (
        <span className='block truncate'>
          {formatValue(key, row.getValue(key))}
        </span>
      ),
    }))
  }, [rows])

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

  return (
    <div className='space-y-3'>
      <Card className='rounded-md'>
        <CardContent>
          <TerritoryWiseItemsFilter
            initialValues={filters ?? undefined}
            onApply={(next) => {
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
                Item Summary Report{' '}
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
                          <TableCell key={cell.id} className='px-3 py-2'>
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

export default ItemSummaryReport
