import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import {
  type ApiResponse,
  type FinalGeoDTO,
  getFinalGeo,
} from '@/services/userDemarcationApi'
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
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return '-'
  }

  return `${value}`
}

const normalizeText = (value?: string | number | null) =>
  typeof value === 'string' ? value.trim() : value == null ? '' : String(value)

const buildFacetOptions = (values: (string | undefined | null)[]) => {
  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value !== '')

  return Array.from(new Set(normalized)).map((value) => ({
    label: value,
    value,
  }))
}

const matchesMultiSelect = (rowValue: unknown, filterValue: unknown) => {
  const values = Array.isArray(filterValue)
    ? filterValue
    : filterValue
      ? [String(filterValue)]
      : []
  if (!values.length) return true
  if (rowValue === null || rowValue === undefined) return false
  const normalizedValues = values.map((value) => value.trim().toLowerCase())
  const normalizedRowValue = String(rowValue).trim().toLowerCase()
  return normalizedValues.includes(normalizedRowValue)
}

const FinalGeographyMapping = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['finalGeography'],
    queryFn: async () => {
      const res = await getFinalGeo()
      return res as ApiResponse<FinalGeoDTO[]>
    },
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const channelFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.channelName)),
    [rows]
  )
  const subChannelFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.subChannelName)),
    [rows]
  )
  const regionFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.regionName)),
    [rows]
  )
  const areaFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.areaName)),
    [rows]
  )
  const territoryFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.territoryName)),
    [rows]
  )

  const filters = useMemo(
    () => [
      {
        columnId: 'channelName',
        title: 'Channel',
        options: channelFilterOptions,
      },
      {
        columnId: 'subChannelName',
        title: 'Sub Channel',
        options: subChannelFilterOptions,
      },
      { columnId: 'regionName', title: 'Region', options: regionFilterOptions },
      { columnId: 'areaName', title: 'Area', options: areaFilterOptions },
      {
        columnId: 'territoryName',
        title: 'Territory',
        options: territoryFilterOptions,
      },
    ],
    [
      channelFilterOptions,
      regionFilterOptions,
      subChannelFilterOptions,
      areaFilterOptions,
      territoryFilterOptions,
    ]
  )

  const columns = useMemo<ColumnDef<FinalGeoDTO, string | number | null>[]>(
    () => [
      {
        header: 'Channel Name',
        id: 'channelName',
        accessorFn: (row) => normalizeText(row.channelName),
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Sub Channel Name',
        id: 'subChannelName',
        accessorFn: (row) => normalizeText(row.subChannelName),
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Region Name',
        id: 'regionName',
        accessorFn: (row) => normalizeText(row.regionName),
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Area Name',
        id: 'areaName',
        accessorFn: (row) => normalizeText(row.areaName),
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Territory Code',
        accessorKey: 'territoryCode',
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Territory Name',
        id: 'territoryName',
        accessorFn: (row) => normalizeText(row.territoryName),
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Agency Code',
        accessorKey: 'agencyCode',
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Distributor Name',
        accessorKey: 'distributorName',
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'SAP Agency Code',
        accessorKey: 'sapAgCode',
        cell: (context) => formatValue(context.getValue()),
      },
      {
        header: 'Warehouse Name',
        accessorKey: 'warehouseName',
        cell: (context) => formatValue(context.getValue()),
      },
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  })
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <Card>
      <CardHeader className='flex items-center justify-between gap-2'>
        <CardTitle className='text-base font-semibold'>
          Final Geography Mapping{' '}
          <CountBadge value={`${filteredCount}/${rows.length}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search final geography...'
          filters={filters}
        />
        <div className='overflow-auto rounded-md border'>
          <Table className='text-xs'>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='text-muted-foreground bg-gray-100 px-2 text-xs font-semibold tracking-wide uppercase dark:bg-gray-900'
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
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-20 text-center'
                  >
                    Loading final geography data...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ??
                      'Failed to load final geography data'}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='px-2 py-3 text-sm'>
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
                    className='h-20 text-center'
                  >
                    No final geography data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
    </Card>
  )
}

export default FinalGeographyMapping
