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
  getItemMainCategories,
  statusChangeMainCategory,
  type ItemMainCategory,
} from '@/services/sales/itemApi'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { TableLoadingRows } from '@/components/data-table'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { CommonDialog } from '@/components/common-dialog'
import MainCategoryForm from '@/components/sales/sales-operations/manage-category/MainCategoryForm'

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return '-'
  }
  return `${value}`
}

const MainCategory = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['main-categories'],
    queryFn: getItemMainCategories,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
    []
  )
  const categoryTypeFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((row) => {
      const name = row.categoryType?.trim()
      if (name) seen.add(name)
    })
    return Array.from(seen).map((value) => ({
      label: value,
      value,
    }))
  }, [rows])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingMainCategory, setEditingMainCategory] =
    useState<ItemMainCategory | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{
    id: number
    nextActive: boolean
    itemMainCat: string
  } | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      setPendingId(id)
      const response = await statusChangeMainCategory(id)
      return { id, response }
    },
    onSuccess: ({ response }) => {
      toast.success(response?.message ?? 'Status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['main-categories'] })
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

  const columns = useMemo<ColumnDef<ItemMainCategory>[]>(
    () => [
      {
        accessorKey: 'categoryType',
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
          <DataTableColumnHeader column={column} title='Category Type' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('categoryType'))}
          </span>
        ),
      },
      {
        accessorKey: 'mainCatSeq',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Main Category Sequence'
          />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue(row.getValue('mainCatSeq'))}
          </span>
        ),
        meta: { thClassName: 'w-[200px] text-center' },
      },
      {
        accessorKey: 'itemMainCat',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Main Category Name' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('itemMainCat'))}
          </span>
        ),
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
          const rowId = (row.original as ItemMainCategory).id
          const itemMainCat =
            (row.original as ItemMainCategory).itemMainCat ?? ''
          return (
            <div className='flex items-center justify-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Edit main category'
                onClick={() => {
                  setDialogMode('edit')
                  setEditingMainCategory(row.original as ItemMainCategory)
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
                    itemMainCat,
                  })
                }}
                disabled={pendingId === rowId || toggleStatusMutation.isPending}
                aria-label={
                  isActive
                    ? 'Deactivate main category'
                    : 'Activate main category'
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
    [pendingId, toggleStatusMutation.isPending]
  )

  const exportRows = useMemo(() => {
    return rows.map((row) => ({
      categoryType: row.categoryType ?? '',
      mainCatSeq: row.mainCatSeq ?? '',
      itemMainCat: row.itemMainCat ?? '',
      status: row.isActive ? 'Active' : 'Inactive',
    }))
  }, [rows])

  const exportColumns = useMemo<
    ExcelExportColumn<(typeof exportRows)[number]>[]
  >(() => {
    return [
      { header: 'Category Type', accessor: 'categoryType' },
      { header: 'Main Category Sequence', accessor: 'mainCatSeq' },
      { header: 'Main Category Name', accessor: 'itemMainCat' },
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
          Main Category List
          <CountBadge value={`${filteredCount}/${rows.length}`} />
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            variant='outline'
            data={exportRows}
            columns={exportColumns}
            fileName='main-category'
            worksheetName='Main Category'
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setDialogMode('create')
              setEditingMainCategory(null)
              setDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Add Main Category
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={[
            {
              columnId: 'categoryType',
              title: 'Category Type',
              options: categoryTypeFilterOptions,
            },
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
                <TableLoadingRows columns={columns.length} />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ??
                      'Failed to load main categories'}
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
                    No main categories found
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
          if (!open) setEditingMainCategory(null)
        }}
        title={
          dialogMode === 'create'
            ? 'Main Category Creation'
            : 'Edit Main Category'
        }
        hideFooter
      >
        <MainCategoryForm
          mode={dialogMode}
          mainCategoryId={editingMainCategory?.id}
          mainCatSeq={editingMainCategory?.mainCatSeq}
          initialValues={{
            catTypeId: editingMainCategory?.catTypeId
              ? String(editingMainCategory.catTypeId)
              : '',
            itemMainCat: editingMainCategory?.itemMainCat ?? '',
            isActive: editingMainCategory?.isActive ?? true,
          }}
          onSubmit={() => {
            setDialogOpen(false)
            setEditingMainCategory(null)
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
        title='Change main category status?'
        desc={
          pendingToggle
            ? `Are you sure you want to ${
                pendingToggle.nextActive ? 'activate' : 'deactivate'
              } this main category${
                pendingToggle.itemMainCat
                  ? ` "${pendingToggle.itemMainCat}"`
                  : ''
              }?`
            : ''
        }
        confirmText={
          pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
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

export default MainCategory
