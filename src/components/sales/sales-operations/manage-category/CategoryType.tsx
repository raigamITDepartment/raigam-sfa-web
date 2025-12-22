import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  changeStatusCategoryType,
  getAllCategoryType,
  type CategoryType as CategoryTypeRecord,
} from '@/services/sales/itemApi'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TableLoadingRows } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CommonDialog } from '@/components/common-dialog'
import CategoryTypeForm from '@/components/sales/sales-operations/manage-category/CategoryTypeForm'

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return '-'
  }
  return `${value}`
}

const CategoryType = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['category-type'],
    queryFn: getAllCategoryType,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
    []
  )
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingCategory, setEditingCategory] =
    useState<CategoryTypeRecord | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{
    id: number
    nextActive: boolean
    categoryType: string
  } | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      setPendingId(id)
      const response = await changeStatusCategoryType(id)
      return { id, response }
    },
    onSuccess: ({ response }) => {
      toast.success(response?.message ?? 'Status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['category-type'] })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update status'
      toast.error(message)
    },
    onSettled: () => {
      setPendingId(null)
    },
  })

  const columns = useMemo<ColumnDef<CategoryTypeRecord>[]>(
    () => [
      {
        accessorKey: 'categoryType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Category Type Name' />
        ),
        cell: ({ row }) => (
          <span className='block truncate pl-3'>
            {formatValue(row.getValue('categoryType'))}
          </span>
        ),
      },
      {
        accessorKey: 'catTypeSeq',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sequence' />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue(row.getValue('catTypeSeq'))}
          </span>
        ),
        meta: { thClassName: 'w-[140px] text-center' },
      },
      {
        accessorKey: 'isActive',
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = String(Boolean(row.getValue(columnId)))
          return values.includes(cellValue)
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const isActive = Boolean(row.getValue('isActive'))
          const variant = isActive ? 'secondary' : 'destructive'
          return (
            <div className='flex w-full justify-center'>
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
        meta: { thClassName: 'w-[140px] text-center' },
      },
      {
        id: 'action',
        header: () => <div className='text-center'>Action</div>,
        cell: ({ row }) => {
          const isActive = Boolean(row.getValue('isActive'))
          const rowId = (row.original as CategoryTypeRecord).id
          const categoryType =
            (row.original as CategoryTypeRecord).categoryType ?? ''
          return (
            <div className='flex items-center justify-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Edit category type'
                onClick={() => {
                  setDialogMode('edit')
                  setEditingCategory(row.original as CategoryTypeRecord)
                  setDialogOpen(true)
                }}
              >
                <Pencil className='h-4 w-4' />
              </Button>
              <Switch
                checked={isActive}
                onCheckedChange={(value) => {
                  setPendingToggle({
                    id: rowId,
                    nextActive: value,
                    categoryType,
                  })
                }}
                disabled={pendingId === rowId || toggleStatusMutation.isPending}
                aria-label={
                  isActive ? 'Deactivate category type' : 'Activate category type'
                }
              />
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { thClassName: 'w-[120px] text-center' },
      },
    ],
    []
  )

  const exportRows = useMemo(() => {
    return rows.map((row) => ({
      categoryType: row.categoryType ?? '',
      catTypeSeq: row.catTypeSeq ?? '',
      status: row.isActive ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns = useMemo<
    ExcelExportColumn<(typeof exportRows)[number]>[]
  >(() => {
    return [
      { header: 'Category Type Name', accessor: 'categoryType' },
      { header: 'Sequence', accessor: 'catTypeSeq' },
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
          Category Type List
          <Badge
            variant='secondary'
            className='text-xs font-medium uppercase'
          >
            {filteredCount}/{rows.length}
          </Badge>
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='category-type'
            worksheetName='Category Type'
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setDialogMode('create')
              setEditingCategory(null)
              setDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Add Category Type
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={[
            {
              columnId: 'isActive',
              title: 'Status',
              options: statusFilterOptions,
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
                      className={header.column.columnDef.meta?.thClassName ?? ''}
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
                <TableLoadingRows columns={columns.length} />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ??
                      'Failed to load category types'}
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
                    No category types found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
      <CommonDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingCategory(null)
          }
        }}
        title={
          dialogMode === 'create'
            ? 'Add Category Type'
            : 'Edit Category Type'
        }
        hideFooter
      >
        <CategoryTypeForm
          mode={dialogMode}
          categoryTypeId={editingCategory?.id}
          catTypeSeq={editingCategory?.catTypeSeq}
          initialValues={{
            categoryType: editingCategory?.categoryType ?? '',
            isActive: editingCategory?.isActive ?? true,
          }}
          onSubmit={() => {
            setDialogOpen(false)
            setEditingCategory(null)
          }}
          onCancel={() => setDialogOpen(false)}
        />
      </CommonDialog>
      <ConfirmDialog
        destructive
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null)
        }}
        title='Change category type status?'
        desc={
          pendingToggle
            ? `Are you sure you want to ${
                pendingToggle.nextActive ? 'activate' : 'deactivate'
              } this category type${
                pendingToggle.categoryType
                  ? ` "${pendingToggle.categoryType}"`
                  : ''
              }?`
            : ''
        }
        confirmText={pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'}
        cancelBtnText='No'
        isLoading={toggleStatusMutation.isPending}
        handleConfirm={() => {
          if (!pendingToggle) return
          toggleStatusMutation.mutate(pendingToggle.id)
          setPendingToggle(null)
        }}
      />
    </Card>
  )
}

export default CategoryType
