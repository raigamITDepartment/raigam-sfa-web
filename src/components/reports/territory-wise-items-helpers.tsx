import { type ColumnDef, type FilterFn } from '@tanstack/react-table'
import type { ExcelExportColumn } from '@/components/excel-export-button'
import type { TerritoryWiseItemSummeryItem as Row } from '@/services/reports/otherReportsApi'

const MAIN_CATEGORY_KEYS = [
  'category',
  'categoryName',
  'itemCategory',
  'mainCatName',
  'subOneCatName',
  'subTwoCatName',
] as const
const SUB_CATEGORY_KEYS = ['subOneCatName', 'subCategory'] as const
const SUB_SUB_CATEGORY_KEYS = ['subTwoCatName', 'subSubCategory'] as const

const pickValue = (row: Row, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const value = (row as Record<string, unknown>)[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const renderText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const renderNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return renderText(value)
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const headerWithBreaks = (title: string) => {
  const words = title.split(' ')
  if (words.length < 2) return title
  if (words.length === 2) {
    return (
      <span className='block whitespace-normal text-center leading-tight'>
        {words[0]}
        <br />
        {words[1]}
      </span>
    )
  }
  const firstLine = words.slice(0, 2).join(' ')
  const secondLine = words.slice(2).join(' ')
  return (
    <span className='block whitespace-normal text-center leading-tight'>
      {firstLine}
      <br />
      {secondLine}
    </span>
  )
}

export const globalFilterFn: FilterFn<Row> = (row, _columnId, filterValue) => {
  const search = String(filterValue ?? '').toLowerCase().trim()
  if (!search) return true
  const values = Object.values(row.original ?? {}).map((val) => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return ''
    return String(val).toLowerCase()
  })
  return values.some((val) => val.includes(search))
}

export const createColumns = (): ColumnDef<Row>[] => [
  {
    id: 'itemName',
    header: 'Item Name',
    accessorFn: (row) =>
      pickValue(row, ['itemName', 'item_name', 'item', 'itemSapCode']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm font-medium'>
        {renderText(getValue())}
      </span>
    ),
  },
  {
    id: 'subSubCategory',
    header: headerWithBreaks('Sub Sub Category'),
    accessorFn: (row) => pickValue(row, SUB_SUB_CATEGORY_KEYS),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm'>{renderText(getValue())}</span>
    ),
    meta: { thClassName: 'text-center' },
    filterFn: 'includesString',
  },
  {
    id: 'subCategory',
    header: headerWithBreaks('Sub Category'),
    accessorFn: (row) => pickValue(row, SUB_CATEGORY_KEYS),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm'>{renderText(getValue())}</span>
    ),
    meta: { thClassName: 'text-center' },
    filterFn: 'includesString',
  },
  {
    id: 'category',
    header: 'Main Category',
    accessorFn: (row) => pickValue(row, MAIN_CATEGORY_KEYS),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm'>{renderText(getValue())}</span>
    ),
    meta: { thClassName: 'text-center' },
    filterFn: 'includesString',
  },
  {
    id: 'bookedQty',
    header: 'Booked Qty',
    accessorFn: (row) =>
      pickValue(row, ['bookedQty', 'bookingQty', 'bookingQuantity', 'totalBookingQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'bookingValue',
    header: 'Booking Value',
    accessorFn: (row) =>
      pickValue(row, ['bookingValue', 'bookedValue', 'bookingVal', 'totalBookingValue']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'soldQty',
    header: 'Sold Qty',
    accessorFn: (row) =>
      pickValue(row, ['soldQty', 'salesQty', 'soldQuantity', 'totalSoldQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'soldValue',
    header: 'Sold Value',
    accessorFn: (row) =>
      pickValue(row, ['soldValue', 'salesValue', 'soldAmount', 'totalSoldValue']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'cancelQty',
    header: 'Cancel Qty',
    accessorFn: (row) =>
      pickValue(row, ['cancelQty', 'cancelledQty', 'cancelQuantity', 'totalCancelQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'freeQty',
    header: 'Free Qty',
    accessorFn: (row) => pickValue(row, ['freeQty', 'freeQuantity', 'totalFreeQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'goodReturnQty',
    header: headerWithBreaks('Good Return Qty'),
    accessorFn: (row) =>
      pickValue(row, ['goodReturnQty', 'goodReturnQuantity', 'totalGoodReturnQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'goodReturnFree',
    header: headerWithBreaks('Good Return Free'),
    accessorFn: (row) =>
      pickValue(row, ['goodReturnFree', 'goodReturnFreeQty', 'totalGoodReturnFreeQty']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'marketReturnQty',
    header: headerWithBreaks('Market Return Qty'),
    accessorFn: (row) =>
      pickValue(row, [
        'marketReturnQty',
        'marketReturnQuantity',
        'totalMarketReturnQty',
      ]),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'marketReturnFree',
    header: headerWithBreaks('Market Return Free'),
    accessorFn: (row) =>
      pickValue(row, [
        'marketReturnFree',
        'marketReturnFreeQty',
        'totalMarketReturnFreeQty',
      ]),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'discount',
    header: 'Discount',
    accessorFn: (row) =>
      pickValue(row, ['discount', 'discountValue', 'totalDiscountValue']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
  {
    id: 'finalValue',
    header: 'Final Value',
    accessorFn: (row) =>
      pickValue(row, ['finalValue', 'netValue', 'totalValue', 'totalFinalValue']),
    cell: ({ getValue }) => (
      <span className='block whitespace-nowrap text-sm text-right tabular-nums'>
        {renderNumber(getValue())}
      </span>
    ),
    meta: { thClassName: 'text-right' },
  },
]

export const createExportColumns = (): ExcelExportColumn<Row>[] => [
  {
    header: 'Item Name',
    accessor: (row) =>
      pickValue(row, ['itemName', 'item_name', 'item', 'itemSapCode']),
  },
  {
    header: 'Sub Sub Category',
    accessor: (row) => pickValue(row, SUB_SUB_CATEGORY_KEYS),
  },
  {
    header: 'Sub Category',
    accessor: (row) => pickValue(row, SUB_CATEGORY_KEYS),
  },
  {
    header: 'Main Category',
    accessor: (row) => pickValue(row, MAIN_CATEGORY_KEYS),
  },
  {
    header: 'Booked Qty',
    accessor: (row) =>
      pickValue(row, ['bookedQty', 'bookingQty', 'bookingQuantity', 'totalBookingQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Booking Value',
    accessor: (row) =>
      pickValue(row, ['bookingValue', 'bookedValue', 'bookingVal', 'totalBookingValue']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Sold Qty',
    accessor: (row) =>
      pickValue(row, ['soldQty', 'salesQty', 'soldQuantity', 'totalSoldQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Sold Value',
    accessor: (row) =>
      pickValue(row, ['soldValue', 'salesValue', 'soldAmount', 'totalSoldValue']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Cancel Qty',
    accessor: (row) =>
      pickValue(row, ['cancelQty', 'cancelledQty', 'cancelQuantity', 'totalCancelQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Free Qty',
    accessor: (row) => pickValue(row, ['freeQty', 'freeQuantity', 'totalFreeQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Good Return Qty',
    accessor: (row) =>
      pickValue(row, ['goodReturnQty', 'goodReturnQuantity', 'totalGoodReturnQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Good Return Free',
    accessor: (row) =>
      pickValue(row, ['goodReturnFree', 'goodReturnFreeQty', 'totalGoodReturnFreeQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Market Return Qty',
    accessor: (row) =>
      pickValue(row, ['marketReturnQty', 'marketReturnQuantity', 'totalMarketReturnQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Market Return Free',
    accessor: (row) =>
      pickValue(row, ['marketReturnFree', 'marketReturnFreeQty', 'totalMarketReturnFreeQty']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Discount',
    accessor: (row) =>
      pickValue(row, ['discount', 'discountValue', 'totalDiscountValue']),
    formatter: (v) => renderNumber(v),
  },
  {
    header: 'Final Value',
    accessor: (row) =>
      pickValue(row, ['finalValue', 'netValue', 'totalValue', 'totalFinalValue']),
    formatter: (v) => renderNumber(v),
  },
]

const buildFacetOptions = (
  rows: Row[],
  getter: (row: Row) => unknown
): { label: string; value: string }[] => {
  const set = new Set<string>()
  rows.forEach((row) => {
    const value = getter(row)
    if (value === null || value === undefined) return
    const label = String(value).trim()
    if (label) set.add(label)
  })
  return Array.from(set).map((value) => ({ label: value, value }))
}

export const buildCategoryFilters = (rows: Row[]) => ({
  mainCategoryOptions: buildFacetOptions(rows, (row) => pickValue(row, MAIN_CATEGORY_KEYS)),
  subCategoryOptions: buildFacetOptions(rows, (row) => pickValue(row, SUB_CATEGORY_KEYS)),
  subSubCategoryOptions: buildFacetOptions(rows, (row) =>
    pickValue(row, SUB_SUB_CATEGORY_KEYS)
  ),
})
