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
  getSurveyResults,
  type SurveyResultItem,
} from '@/services/survey/surveyAPI'
import { CommonAlert } from '@/components/common-alert'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

const matchesMultiSelect = (rowValue: unknown, filterValue: unknown) => {
  const values = Array.isArray(filterValue)
    ? filterValue
    : filterValue
      ? [String(filterValue)]
      : []
  if (!values.length) return true
  if (rowValue === null || rowValue === undefined) return false
  return values.includes(String(rowValue))
}

const CENTERED_COLUMN_IDS = new Set([
  'areaName',
  'territoryName',
  'userId',
  'userName',
  'dayTarget',
  'dayCount',
  'surveyDate',
  'surveyCount',
  'timeFrameCount',
  'outOfTimeFrameCount',
])

const SURVEY_REPORT_EXPORT_COLUMNS: ExcelExportColumn<SurveyResultItem>[] = [
  { header: 'Sub Channel', accessor: 'subChannelName' },
  { header: 'Area', accessor: 'areaName' },
  { header: 'Territory', accessor: 'territoryName' },
  { header: 'User ID', accessor: 'userId' },
  { header: 'User Name', accessor: 'userName' },
  { header: 'Day Target', accessor: 'dayTarget' },
  { header: 'Day Count', accessor: 'dayCount' },
  { header: 'Survey Date', accessor: 'surveyDate' },
  { header: 'Survey Count', accessor: 'surveyCount' },
  { header: 'Time Frame Count', accessor: 'timeFrameCount' },
  { header: 'Out Of Time Frame', accessor: 'outOfTimeFrameCount' },
]

export function SurveyReport() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['survey-report', 'getSurveyResults'],
    queryFn: getSurveyResults,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])

  const columns = useMemo<ColumnDef<SurveyResultItem>[]>(
    () => [
      {
        accessorKey: 'subChannelName',
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Channel' />
        ),
        cell: ({ row }) => (
          <span className='block pl-3'>
            {row.original.subChannelName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'areaName',
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Area'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.areaName || '-'}</span>
        ),
      },
      {
        accessorKey: 'territoryName',
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Territory'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.territoryName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'userId',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='User ID'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.userId ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'userName',
        filterFn: (row, columnId, filterValue) =>
          matchesMultiSelect(row.getValue(columnId), filterValue),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='User Name'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.userName || '-'}</span>
        ),
      },
      {
        accessorKey: 'dayTarget',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Day Target'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.dayTarget ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'dayCount',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Day Count'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.dayCount ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'surveyDate',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Survey Date'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>{row.original.surveyDate || '-'}</span>
        ),
      },
      {
        accessorKey: 'surveyCount',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Survey Count'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.surveyCount ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'timeFrameCount',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Time Frame Count'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.timeFrameCount ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'outOfTimeFrameCount',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Out Of Time Frame'
            className='w-full justify-center text-center'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center'>
            {row.original.outOfTimeFrameCount ?? '-'}
          </span>
        ),
      },
    ],
    []
  )
  const toolbarFilters = useMemo(() => {
    return [
      {
        columnId: 'subChannelName',
        title: 'Sub Channel',
        showCountBadge: true,
        options: buildFacetOptions(rows.map((row) => row.subChannelName)),
      },
      {
        columnId: 'areaName',
        title: 'Area',
        showCountBadge: true,
        options: buildFacetOptions(rows.map((row) => row.areaName)),
      },
      {
        columnId: 'territoryName',
        title: 'Territory',
        showCountBadge: true,
        options: buildFacetOptions(rows.map((row) => row.territoryName)),
      },
      {
        columnId: 'userName',
        title: 'User Name',
        showCountBadge: true,
        options: buildFacetOptions(rows.map((row) => row.userName)),
      },
    ]
  }, [rows])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <Card>
      <CardHeader className='space-y-3'>
        <CardTitle className='inline-flex items-center gap-2'>
          <span>Survey Report Results</span>
          <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            {`${filteredCount}/${rows.length}`}
          </span>
        </CardTitle>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search survey report...'
          filters={toolbarFilters}
          rightContent={
            <ExcelExportButton
              data={table
                .getFilteredRowModel()
                .rows.map((tableRow) => tableRow.original)}
              columns={SURVEY_REPORT_EXPORT_COLUMNS}
              fileName='survey-report-results'
              variant='outline'
              size='sm'
              className='h-8 gap-2 rounded-sm border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
            />
          }
        />
      </CardHeader>
      <CardContent className='space-y-4'>
        {isError && (
          <CommonAlert
            variant='error'
            title='Failed to load survey report'
            description={error instanceof Error ? error.message : undefined}
          />
        )}

        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        CENTERED_COLUMN_IDS.has(String(header.column.id)) &&
                          'text-center'
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
                <TableLoadingRows columns={columns.length} rows={8} />
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          CENTERED_COLUMN_IDS.has(String(cell.column.id)) &&
                            'text-center'
                        )}
                      >
                        {(() => {
                          const rendered = flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                          return rendered === null ||
                            rendered === undefined ||
                            rendered === ''
                            ? '-'
                            : rendered
                        })()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-muted-foreground h-24 text-center'
                  >
                    No survey report data found.
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
