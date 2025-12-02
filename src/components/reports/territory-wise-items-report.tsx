import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table'
import {
  territoryWiseItemSummeryByRequiredArgs,
  type TerritoryWiseItemSummeryItem,
} from '@/services/reports/otherReportsApi'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { CommonAlert } from '@/components/common-alert'
import { ExcelExportButton } from '@/components/excel-export-button'
import {
  buildCategoryFilters,
  createColumns,
  createExportColumns,
  globalFilterFn,
} from './territory-wise-items-helpers'
import TerritoryWiseItemsFilter, {
  type TerritoryWiseItemsFilters,
} from './Filter'

type Row = TerritoryWiseItemSummeryItem

const TerritoryWiseItemsReport = () => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filters, setFilters] = useState<TerritoryWiseItemsFilters>({
    startDate: todayIso,
    endDate: todayIso,
  })
  const hasFilters =
    Boolean(filters.territoryId) &&
    Boolean(filters.startDate) &&
    Boolean(filters.endDate)

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      'territory-wise-item-summary',
      filters.territoryId ?? 'none',
      filters.startDate ?? 'none',
      filters.endDate ?? 'none',
      filters.areaId ?? 'none',
    ],
    queryFn: () =>
      territoryWiseItemSummeryByRequiredArgs({
        territoryId: filters.territoryId ?? 0,
        startDate: filters.startDate ?? todayIso,
        endDate: filters.endDate ?? todayIso,
      }),
    enabled: hasFilters,
    staleTime: 5 * 60 * 1000,
  })

  const rows = useMemo<Row[]>(
    () => (reportData?.payload ?? []) as Row[],
    [reportData]
  )

  const { mainCategoryOptions, subCategoryOptions, subSubCategoryOptions } = useMemo(
    () => buildCategoryFilters(rows),
    [rows]
  )
  const columns = useMemo(() => createColumns(), [])
  const exportColumns = useMemo(() => createExportColumns(), [])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    filterFns: {
      global: globalFilterFn,
    },
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    getRowId: (_row, index) => `${index}`,
  })

  const tableRows = table.getRowModel().rows
  const showNoData = hasFilters && !isLoading && !isError && rows.length === 0
  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const skeletonRowCount = table.getState().pagination.pageSize || 10

  return (
    <div className='space-y-4'>
      <Card className='p-4 shadow-sm'>
        <TerritoryWiseItemsFilter
          initialValues={filters}
          onApply={(next) => {
            setFilters(next)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
        />
      </Card>

      {!hasFilters ? (
        <CommonAlert
          variant='info'
          title='Pick filters to load the report'
          description='Select territory and date range, then click Load Report.'
          className='shadow-sm'
        />
      ) : (
        <Card className='overflow-hidden shadow-sm'>
          
          <CardContent className='space-y-4'>
            {isLoading ? (
              <div className='rounded-md border'>
                <Table className='text-xs'>
                  <TableHeader>
                    <TableRow>
                      {(columns.length ? columns : [{ id: 'loading' }]).map(
                        (col) => (
                          <TableHead
                            key={col.id}
                            className='bg-gray-100 px-3 py-2'
                          >
                            {typeof col.header === 'string'
                              ? col.header
                              : 'Loading...'}
                          </TableHead>
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: skeletonRowCount }).map((_, idx) => (
                      <TableRow
                        key={idx}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900/20'
                            : 'bg-gray-50 dark:bg-slate-900/40'
                        }
                      >
                        {(columns.length ? columns : [{ id: 'loading' }]).map(
                          (_col, colIdx) => (
                            <TableCell
                              key={`${idx}-${colIdx}`}
                              className='px-3 py-3'
                            >
                              <div className='h-4 w-full animate-pulse rounded bg-slate-200' />
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {!isLoading && !isError && rows.length > 0 ? (
              <>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <DataTableToolbar
                      table={table}
                      searchPlaceholder='Search report...'
                      filters={[
                        {
                          columnId: 'subCategory',
                          title: 'Sub Category',
                          options: subCategoryOptions,
                        },
                        {
                          columnId: 'subSubCategory',
                          title: 'Sub Sub Category',
                          options: subSubCategoryOptions,
                        },
                        {
                          columnId: 'category',
                          title: 'Main Category',
                          options: mainCategoryOptions,
                        },
                      ]}
                      rightContent={
                        <ExcelExportButton
                          size='sm'
                          variant='outline'
                          data={rows}
                          fileName='territory-wise-items-report'
                          worksheetName='Territory Wise Items'
                          columns={exportColumns}
                        />
                      }
                    />
                  </div>
                  <div className='flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100'>
                    Items
                    <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                      {filteredCount}/{totalCount}
                    </span>
                  </div>
                </div>
                <div className='overflow-auto rounded-md border'>
                  <Table className='text-xs'>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className={
                                'bg-gray-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide dark:bg-gray-900 ' +
                                (header.column.columnDef.meta?.thClassName ?? '')
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
                      {tableRows.length ? (
                        tableRows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected()}
                            className={
                              Number(row.id) % 2 === 0
                                ? 'bg-white dark:bg-slate-900/20'
                                : 'bg-gray-50 dark:bg-slate-900/40'
                            }
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className='px-3 py-2 text-sm'
                              >
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
                            colSpan={columns.length || 1}
                            className='h-20 text-center'
                          >
                            No items match your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={table} />
              </>
            ) : null}

            {isError ? (
              <CommonAlert
                variant='error'
                title='Failed to load report'
                description={
                  error instanceof Error ? error.message : undefined
                }
              />
            ) : null}

            {showNoData ? (
              <CommonAlert
                variant='info'
                title='No data for selected filters'
                description='Try a different date range or territory.'
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TerritoryWiseItemsReport
