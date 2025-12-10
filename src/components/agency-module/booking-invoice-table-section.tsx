import {
  flexRender,
  type ColumnDef,
  type Table as ReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { CommonAlert } from '@/components/common-alert'
import type { BookingInvoiceReportItem } from '@/types/invoice'
import { Printer } from 'lucide-react'

interface BookingInvoiceTableSectionProps {
  table: ReactTable<BookingInvoiceReportItem>
  columns: ColumnDef<BookingInvoiceReportItem>[]
  isLoading: boolean
  isError: boolean
  error: unknown
  rows: BookingInvoiceReportItem[]
  statusFilterOptions: { label: string; value: string }[]
  onPrintClick: () => void
  isPrintDisabled: boolean
}

export function BookingInvoiceTableSection({
  table,
  columns,
  isLoading,
  isError,
  error,
  rows,
  statusFilterOptions,
  onPrintClick,
  isPrintDisabled,
}: BookingInvoiceTableSectionProps) {
  const tableRows = table.getRowModel().rows
  const hasRows = tableRows.length > 0
  const hasPayload = rows.length > 0
  const showNoData = !isLoading && !isError && !hasPayload

  return (
    <>
      {isLoading ? (
        <div className="mt-4 mb-4 rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        'h-10 bg-gray-100 px-3 text-left dark:bg-gray-900 ' +
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
              {Array.from({ length: table.getState().pagination.pageSize }).map(
                (_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    {columns.map((_, colIdx) => (
                      <TableCell
                        key={`${idx}-${colIdx}`}
                        className="px-3 py-1 align-middle"
                      >
                        <Skeleton className="h-5 w-full rounded-sm bg-slate-200/80 dark:bg-slate-800/60" />
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!isLoading && !isError && hasPayload ? (
        <>
          <DataTableToolbar
            table={table}
            searchPlaceholder="Search invoice id..."
            searchKey="invoiceNo"
            filters={[
              {
                columnId: 'status',
                title: 'Status',
                options: statusFilterOptions,
              },
            ]}
            rightContentAfterViewOptions={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 px-3"
                onClick={onPrintClick}
                disabled={isPrintDisabled}
              >
                <Printer className="h-4 w-4" />
                Print Selected
              </Button>
            }
          />
          <div className="mt-4 mb-4 rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                      className={
                        'h-10 bg-gray-100 px-3 text-left dark:bg-gray-900 ' +
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
                {hasRows ? (
                  tableRows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="px-3 align-middle"
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
                      colSpan={columns.length}
                      className="h-20 text-center"
                    >
                      No invoices match your search or filters.
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
          variant="error"
          title="Failed to load invoices"
          description={
            error instanceof Error ? error.message : 'Unknown error occurred'
          }
        />
      ) : null}

      {showNoData ? (
        <CommonAlert
          variant="info"
          title="No invoices found"
          description="No data for the selected date range and invoice type. Try adjusting filters."
        />
      ) : null}
    </>
  )
}

export default BookingInvoiceTableSection
