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
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import {
  getAllItemsSequence,
  type ItemSequence,
} from '@/services/sales/itemApi'
import { Badge } from '@/components/ui/badge'
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
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return '-'
  }
  return `${value}`
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

const ViewItemRangeWise = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['item-sequence'],
    queryFn: getAllItemsSequence,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const rangeFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.shortName)),
    [rows]
  )
  const channelFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.channelName)),
    [rows]
  )
  const subChannelFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.subChannelName)),
    [rows]
  )

  const columns = useMemo<ColumnDef<ItemSequence>[]>(
    () => [
      {
        accessorKey: 'itemName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Item Name' />
        ),
        cell: ({ row }) => (
          <span className='block truncate pl-3'>
            {formatValue(row.getValue('itemName'))}
          </span>
        ),
      },
      {
        accessorKey: 'shortName',
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Range Name' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('shortName'))}
          </span>
        ),
      },
      {
        accessorKey: 'channelName',
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Channel' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('channelName'))}
          </span>
        ),
      },
      {
        accessorKey: 'subChannelName',
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub-Channel' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('subChannelName'))}
          </span>
        ),
      },
      {
        accessorKey: 'itemSequence',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Item Seq' />
        ),
        cell: ({ row }) => (
          <span className='block text-right tabular-nums'>
            {formatValue(row.getValue('itemSequence'))}
          </span>
        ),
        meta: { thClassName: 'w-[120px] text-right' },
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const isActive = Boolean(row.getValue('isActive'))
          const variant = isActive ? 'secondary' : 'destructive'
          return (
            <div className='flex justify-center'>
              <Badge
                variant={variant as any}
                className={
                  isActive
                    ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
                    : undefined
                }
              >
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          )
        },
        meta: { thClassName: 'w-[120px] text-center' },
      },
    ],
    []
  )

  const exportRows = useMemo(() => {
    return rows.map((row) => ({
      itemName: row.itemName ?? '',
      rangeName: row.shortName ?? '',
      channelName: row.channelName ?? '',
      subChannelName: row.subChannelName ?? '',
      itemSequence: row.itemSequence,
      status: row.isActive ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns = useMemo<
    ExcelExportColumn<(typeof exportRows)[number]>[]
  >(() => {
    return [
      { header: 'Item Name', accessor: 'itemName' },
      { header: 'Range Name', accessor: 'rangeName' },
      { header: 'Channel', accessor: 'channelName' },
      { header: 'Sub-Channel', accessor: 'subChannelName' },
      { header: 'Item Seq', accessor: 'itemSequence' },
      { header: 'Status', accessor: 'status' },
    ]
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    autoResetPageIndex: false,
  })
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle className='flex items-center gap-2 text-base font-semibold'>
          View All Items
          <CountBadge value={`${filteredCount}/${rows.length}`} />
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='item-range-wise'
            worksheetName='Item Range Wise'
          />
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={[
            {
              columnId: 'shortName',
              title: 'Range',
              options: rangeFilterOptions,
            },
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
          ]}
        />
        <div className='rounded-md border'>
          <Table className='text-xs'>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.columnDef.meta?.thClassName ?? ''
                      }
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
                    Loading items...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load items'}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    No items found
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

export default ViewItemRangeWise
