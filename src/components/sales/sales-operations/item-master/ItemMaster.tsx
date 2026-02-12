import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
  type VisibilityState,
} from '@tanstack/react-table'
import {
  changeStatusItem,
  getAllItemMaster,
  type ItemMaster as ItemMasterRecord,
} from '@/services/sales/itemApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
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
  TableLoadingRows,
} from '@/components/data-table'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import { Plus } from 'lucide-react'

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

const resolveItemId = (item: ItemMasterRecord): number | null => {
  const raw = (item as ItemMasterRecord & { itemId?: number | string }).itemId
  if (raw === null || raw === undefined) return null
  const id = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(id) ? id : null
}

const resolveItemActive = (item: ItemMasterRecord): boolean | undefined => {
  const candidate = (item as ItemMasterRecord & {
    isActive?: boolean
    active?: boolean
    status?: boolean
  })
  if (typeof candidate.isActive === 'boolean') return candidate.isActive
  if (typeof candidate.active === 'boolean') return candidate.active
  if (typeof candidate.status === 'boolean') return candidate.status
  return undefined
}

const ItemMaster = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['item-master'],
    queryFn: getAllItemMaster,
  })

  const queryClient = useQueryClient()
  const rows = useMemo(() => data?.payload ?? [], [data])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    status: true,
  })
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({})
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{
    itemId: number
    nextActive: boolean
    itemName?: string | null
  } | null>(null)

  const companyFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.itemTypeName)),
    [rows]
  )
  const categoryFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.categoryType)),
    [rows]
  )
  const mainCategoryFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.mainCatName)),
    [rows]
  )
  const flavorFilterOptions = useMemo(
    () => buildFacetOptions(rows.map((row) => row.subCatThreeName)),
    [rows]
  )
  const statusFilterOptions = useMemo(
    () => [
      { label: 'Active', value: 'Active' },
      { label: 'Inactive', value: 'Inactive' },
    ],
    []
  )

  useEffect(() => {
    if (!rows.length) return
    setActiveMap((prev) => {
      const next = { ...prev }
      rows.forEach((row) => {
        const itemId = resolveItemId(row)
        if (itemId == null) return
        if (typeof next[itemId] === 'boolean') return
        const rowActive = resolveItemActive(row)
        next[itemId] = typeof rowActive === 'boolean' ? rowActive : true
      })
      return next
    })
  }, [rows])

  const toggleStatusMutation = useMutation({
    onMutate: (payload) => {
      setPendingId(payload.itemId)
    },
    mutationFn: async (payload: { itemId: number; nextActive: boolean }) => {
      const response = await changeStatusItem(payload.itemId)
      return { payload, response }
    },
    onSuccess: ({ payload, response }) => {
      toast.success(response?.message ?? 'Status updated successfully')
      const responseActive = resolveItemActive(
        (response?.payload ?? {}) as ItemMasterRecord
      )
      const nextActive =
        typeof responseActive === 'boolean'
          ? responseActive
          : payload.nextActive
      setActiveMap((prev) => ({ ...prev, [payload.itemId]: nextActive }))
      queryClient.invalidateQueries({ queryKey: ['item-master'] })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      toast.error(message)
    },
    onSettled: () => {
      setPendingId(null)
    },
  })

  const columns = useMemo<ColumnDef<ItemMasterRecord>[]>(
    () => [
      {
        accessorKey: 'imagePath',
        header: () => <div className='text-center'>Image</div>,
        cell: ({ row }) => {
          const imagePath = row.getValue('imagePath') as string | null
          const itemName = (row.original as ItemMasterRecord).itemName ?? 'Item'
          return (
            <div className='flex justify-center'>
              {imagePath && imagePath.trim() !== '' ? (
                <img
                  src={imagePath}
                  alt={itemName}
                  className='h-9 w-9 rounded-md object-cover'
                  loading='lazy'
                />
              ) : (
                <div className='flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500'>
                  N/A
                </div>
              )}
            </div>
          )
        },
        meta: { thClassName: 'w-[70px] text-center' },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'sapCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='SAP Code' />
        ),
        cell: ({ row }) => (
          <span className='block truncate pl-3'>
            {formatValue(row.getValue('sapCode'))}
          </span>
        ),
      },
      {
        accessorKey: 'ln',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='LN' />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue(row.getValue('ln'))}
          </span>
        ),
        meta: { thClassName: 'w-[90px] text-center' },
      },
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
        accessorKey: 'itemTypeName',
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
          <DataTableColumnHeader column={column} title='Company' />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-center'>
            {formatValue(row.getValue('itemTypeName'))}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'unitOfMeasure',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='UMO' />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-center'>
            {formatValue(row.getValue('unitOfMeasure'))}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'innerCount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Inner Count' />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue(row.getValue('innerCount'))}
          </span>
        ),
        meta: { thClassName: 'w-[120px] text-center' },
      },
      {
        accessorKey: 'size',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Size' />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-center'>
            {formatValue(row.getValue('size'))}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'measurement',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Measurement' />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-center'>
            {formatValue(row.getValue('measurement'))}
          </span>
        ),
        meta: { thClassName: 'text-center' },
      },
      {
        accessorKey: 'volume',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Volume' />
        ),
        cell: ({ row }) => (
          <span className='block text-right tabular-nums'>
            {formatValue(row.getValue('volume'))}
          </span>
        ),
        meta: { thClassName: 'w-[110px] text-right' },
      },
      {
        accessorKey: 'weight',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Weight' />
        ),
        cell: ({ row }) => (
          <span className='block text-center tabular-nums'>
            {formatValue(row.getValue('weight'))}
          </span>
        ),
        meta: { thClassName: 'w-[110px] text-center' },
      },
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
        accessorKey: 'mainCatName',
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
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('mainCatName'))}
          </span>
        ),
      },
      {
        accessorKey: 'subCatOneName',
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
          <DataTableColumnHeader column={column} title='Sub Category' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('subCatOneName'))}
          </span>
        ),
      },
      {
        accessorKey: 'subCatTwoName',
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
          <DataTableColumnHeader column={column} title='Sub-Sub Category' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('subCatTwoName'))}
          </span>
        ),
      },
      {
        accessorKey: 'subCatThreeName',
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
          <DataTableColumnHeader column={column} title='Flavor' />
        ),
        cell: ({ row }) => (
          <span className='block truncate'>
            {formatValue(row.getValue('subCatThreeName'))}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => {
          const itemId = resolveItemId(row as ItemMasterRecord)
          const isActive =
            itemId == null
              ? resolveItemActive(row as ItemMasterRecord) ?? true
              : activeMap[itemId] ?? resolveItemActive(row as ItemMasterRecord) ?? true
          return isActive ? 'Active' : 'Inactive'
        },
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue)
            ? filterValue
            : filterValue
              ? [String(filterValue)]
              : []
          if (!values.length) return true
          const cellValue = row.getValue(columnId) as string
          return values.includes(String(cellValue))
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          const isActive = status === 'Active'
          return (
            <div className='flex justify-center'>
              <Badge
                variant={isActive ? 'secondary' : 'destructive'}
                className={
                  isActive
                    ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
                    : undefined
                }
              >
                {status}
              </Badge>
            </div>
          )
        },
        meta: { thClassName: 'w-[120px] text-center' },
      },
      {
        id: 'action',
        header: () => <div className='text-center'>Action</div>,
        cell: ({ row }) => {
          const itemId = resolveItemId(row.original as ItemMasterRecord)
          if (itemId == null) {
            return <div className='text-center'>-</div>
          }
          const isActive = activeMap[itemId] ?? resolveItemActive(row.original) ?? true
          const isPendingRow = pendingId === itemId || toggleStatusMutation.isPending
          return (
            <div className='flex justify-center'>
              <Switch
                checked={isActive}
                onCheckedChange={(value) => {
                  setPendingToggle({
                    itemId,
                    nextActive: value,
                    itemName: (row.original as ItemMasterRecord).itemName ?? '',
                  })
                }}
                disabled={isPendingRow}
                aria-label={isActive ? 'Deactivate item' : 'Activate item'}
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

  type ItemMasterExportRow = {
    imagePath: string
    sapCode: string
    ln: string | number
    itemName: string
    company: string
    unitOfMeasure: string
    innerCount: string | number
    size: string
    measurement: string
    volume: string | number
    weight: string | number
    categoryType: string
    mainCategory: string
    subCategory: string
    subSubCategory: string
    flavor: string
    status: string
  }

  const exportColumns = useMemo<ExcelExportColumn<ItemMasterExportRow>[]>(() => {
    return [
      { header: 'Image', accessor: 'imagePath' },
      { header: 'SAP Code', accessor: 'sapCode' },
      { header: 'LN', accessor: 'ln' },
      { header: 'Item Name', accessor: 'itemName' },
      { header: 'Company', accessor: 'company' },
      { header: 'UMO', accessor: 'unitOfMeasure' },
      { header: 'Inner Count', accessor: 'innerCount' },
      { header: 'Size', accessor: 'size' },
      { header: 'Measurement', accessor: 'measurement' },
      { header: 'Volume', accessor: 'volume' },
      { header: 'Weight', accessor: 'weight' },
      { header: 'Category Type', accessor: 'categoryType' },
      { header: 'Main Category', accessor: 'mainCategory' },
      { header: 'Sub Category', accessor: 'subCategory' },
      { header: 'Sub-Sub Category', accessor: 'subSubCategory' },
      { header: 'Flavor', accessor: 'flavor' },
      { header: 'Status', accessor: 'status' },
    ]
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    autoResetPageIndex: false,
  })
  const filteredCount = table.getFilteredRowModel().rows.length

  const exportRows = useMemo<ItemMasterExportRow[]>(() => {
    return table.getFilteredRowModel().rows.map((row) => {
      const item = row.original as ItemMasterRecord
      const itemId = resolveItemId(item)
      const isActive =
        itemId == null
          ? resolveItemActive(item) ?? true
          : activeMap[itemId] ?? resolveItemActive(item) ?? true
      return {
        imagePath: item.imagePath ?? '',
        sapCode: item.sapCode ?? '',
        ln: item.ln ?? '',
        itemName: item.itemName ?? '',
        company: item.itemTypeName ?? '',
        unitOfMeasure: item.unitOfMeasure ?? '',
        innerCount: item.innerCount ?? '',
        size: item.size ?? '',
        measurement: item.measurement ?? '',
        volume: item.volume ?? '',
        weight: item.weight ?? '',
        categoryType: item.categoryType ?? '',
        mainCategory: item.mainCatName ?? '',
        subCategory: item.subCatOneName ?? '',
        subSubCategory: item.subCatTwoName ?? '',
        flavor: item.subCatThreeName ?? '',
        status: isActive ? 'Active' : 'Inactive',
      }
    })
  }, [table, activeMap])

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle className='flex items-center gap-2 text-base font-semibold'>
          Item Master List
          <CountBadge value={`${filteredCount}/${rows.length}`} />
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ExcelExportButton
            size='sm'
            data={exportRows}
            columns={exportColumns}
            fileName='item-master'
            worksheetName='Item Master'
          />
          <Button asChild size='sm' variant='outline'>
            <Link to='/sales/sales-operations/item-add'>
              <Plus className='h-4 w-4' />
              Add Item
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Search all columns...'
          filters={[
            {
              columnId: 'itemTypeName',
              title: 'Company',
              options: companyFilterOptions,
            },
            {
              columnId: 'categoryType',
              title: 'Category Type',
              options: categoryFilterOptions,
            },
            {
              columnId: 'mainCatName',
              title: 'Main Category',
              options: mainCategoryFilterOptions,
            },
            {
              columnId: 'subCatThreeName',
              title: 'Flavor',
              options: flavorFilterOptions,
            },
            {
              columnId: 'status',
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
                <TableLoadingRows columns={columns.length || 1} />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='text-destructive h-20 text-center'
                  >
                    {(error as Error)?.message ?? 'Failed to load item master'}
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
      <ConfirmDialog
        destructive
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null)
        }}
        title='Change item status?'
        desc={
          pendingToggle
            ? `Are you sure you want to ${
                pendingToggle.nextActive ? 'activate' : 'deactivate'
              } this item${
                pendingToggle.itemName
                  ? ` "${pendingToggle.itemName}"`
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
          toggleStatusMutation.mutate({
            itemId: pendingToggle.itemId,
            nextActive: pendingToggle.nextActive,
          })
          setPendingToggle(null)
        }}
      />
    </Card>
  )
}

export default ItemMaster
