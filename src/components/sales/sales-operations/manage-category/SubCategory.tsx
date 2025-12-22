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
  changeStatusSubCategory,
  getAllSubcategory,
  getItemMainCategories,
  type ItemMainCategory,
  type SubCategoryOne,
} from '@/services/sales/itemApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import SubCategoryForm from '@/components/sales/sales-operations/manage-category/SubCategoryForm'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return '-'
  }
  return `${value}`
}

const SubCategory = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sub-categories'],
    queryFn: getAllSubcategory,
  })
  const { data: mainCategoriesData } = useQuery({
    queryKey: ['main-categories'],
    queryFn: getItemMainCategories,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const mainCategories = useMemo(
    () => (mainCategoriesData?.payload ?? []) as ItemMainCategory[],
    [mainCategoriesData]
  )
  const mainCategoryById = useMemo(() => {
    const map = new Map<number, ItemMainCategory>()
    mainCategories.forEach((mainCat) => {
      map.set(mainCat.id, mainCat)
    })
    return map
  }, [mainCategories])

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingSubCategory, setEditingSubCategory] =
    useState<SubCategoryOne | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{
    id: number
    nextActive: boolean
    subCatOneName: string
  } | null>(null)

  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
    []
  )
  const mainCategoryFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    mainCategories.forEach((mainCat) => {
      const name = mainCat.itemMainCat?.trim()
      if (name) seen.add(name)
    })
    return Array.from(seen).map((value) => ({
      label: value,
      value,
    }))
  }, [mainCategories])

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      setPendingId(id)
      const response = await changeStatusSubCategory(id)
      return { id, response }
    },
    onSuccess: ({ response }) => {
      toast.success(response?.message ?? 'Status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['sub-categories'] })
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

  const columns = useMemo<ColumnDef<SubCategoryOne>[]>(
    () => [
      {
        id: 'categoryType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Category Type' />
        ),
        cell: ({ row }) => {
          const mainCatId = (row.original as SubCategoryOne).mainCatId
          const categoryType = mainCategoryById.get(mainCatId)?.categoryType
          return <span className='block truncate'>{formatValue(categoryType)}</span>
        },
      },
      {
        id: 'mainCategory',
        accessorFn: (row) =>
          mainCategoryById.get(row.mainCatId)?.itemMainCat ?? '',
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
          <DataTableColumnHeader column={column} title='Main Category' />
        ),
        cell: ({ row }) => {
          const mainCatId = (row.original as SubCategoryOne).mainCatId
          const mainCatName = mainCategoryById.get(mainCatId)?.itemMainCat
          return <span className='block truncate'>{formatValue(mainCatName)}</span>
        },
      },
      {
        accessorKey: 'subCatSeq',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Category Sequence' />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue((row.original as any).subCatSeq)}
          </span>
        ),
        meta: { thClassName: 'w-[200px] text-center' },
      },
      {
        accessorKey: 'subCatOneName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sub Category Name' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('subCatOneName'))}
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
          const rowId = (row.original as SubCategoryOne).id
          const subCatOneName =
            (row.original as SubCategoryOne).subCatOneName ?? ''
          return (
            <div className='flex items-center justify-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Edit sub category'
                onClick={() => {
                  setDialogMode('edit')
                  setEditingSubCategory(row.original as SubCategoryOne)
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
                    subCatOneName,
                  })
                }}
                disabled={pendingId === rowId || toggleStatusMutation.isPending}
                aria-label={
                  isActive
                    ? 'Deactivate sub category'
                    : 'Activate sub category'
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
    [mainCategoryById, pendingId, toggleStatusMutation.isPending]
  )

  const exportRows = useMemo(() => {
    return rows.map((row) => {
      const mainCat = mainCategoryById.get(row.mainCatId)
      return {
        categoryType: mainCat?.categoryType ?? '',
        mainCategory: mainCat?.itemMainCat ?? '',
        subCatSeq: (row as any).subCatSeq ?? '',
        subCatOneName: row.subCatOneName ?? '',
        status: row.isActive ? 'Active' : 'Inactive',
      }
    })
  }, [mainCategoryById, rows])

  const exportColumns = useMemo<
    ExcelExportColumn<(typeof exportRows)[number]>[]
  >(() => {
    return [
      { header: 'Category Type', accessor: 'categoryType' },
      { header: 'Main Category', accessor: 'mainCategory' },
      { header: 'Sub Category Sequence', accessor: 'subCatSeq' },
      { header: 'Sub Category Name', accessor: 'subCatOneName' },
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
          Sub Category List
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
            fileName='sub-category'
            worksheetName='Sub Category'
          />
          <Button
            size='sm'
            className='gap-1'
            onClick={() => {
              setDialogMode('create')
              setEditingSubCategory(null)
              setDialogOpen(true)
            }}
          >
            <Plus className='size-4' />
            Add Sub Category
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={[
            {
              columnId: 'mainCategory',
              title: 'Main Category',
              options: mainCategoryFilterOptions,
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
                      'Failed to load sub categories'}
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
                    No sub categories found
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
          if (!open) setEditingSubCategory(null)
        }}
        title={
          dialogMode === 'create'
            ? 'Sub Category Creation'
            : `Sub Category Edit (ID: ${editingSubCategory?.id ?? '-'})`
        }
        hideFooter
      >
        <SubCategoryForm
          mode={dialogMode}
          subCategoryId={editingSubCategory?.id}
          subCatSeq={(editingSubCategory as any)?.subCatSeq}
          initialValues={{
            mainCatId: editingSubCategory?.mainCatId
              ? String(editingSubCategory.mainCatId)
              : '',
            subCatOneName: editingSubCategory?.subCatOneName ?? '',
            subCatSeq: String((editingSubCategory as any)?.subCatSeq ?? ''),
            isActive: editingSubCategory?.isActive ?? true,
          }}
          onSubmit={() => {
            setDialogOpen(false)
            setEditingSubCategory(null)
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
        title='Change sub category status?'
        desc={
          pendingToggle
            ? `Are you sure you want to ${
                pendingToggle.nextActive ? 'activate' : 'deactivate'
              } this sub category${
                pendingToggle.subCatOneName
                  ? ` "${pendingToggle.subCatOneName}"`
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

export default SubCategory
