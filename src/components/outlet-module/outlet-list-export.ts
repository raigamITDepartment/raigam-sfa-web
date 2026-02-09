import type { ExcelExportColumn } from '@/components/excel-export-button'
import type { OutletRecord } from '@/types/outlet'
import { normalizeBool, pickFirstValue } from './outlet-list-utils'

export const createOutletExportColumns = (): ExcelExportColumn<OutletRecord>[] => [
  {
    header: 'Name',
    accessor: (row) => pickFirstValue(row, ['outletName', 'name']),
  },
  {
    header: 'Created',
    accessor: (row) => row.created,
  },
  {
    header: 'Outlet Id',
    accessor: (row) => pickFirstValue(row, ['outletCode', 'outletId', 'id']),
  },
  {
    header: 'Category',
    accessor: (row) =>
      pickFirstValue(row, ['outletCategoryName', 'outletCategory', 'category']),
  },
  {
    header: 'Route',
    accessor: (row) => row.routeName,
  },
  {
    header: 'Owner',
    accessor: (row) => pickFirstValue(row, ['ownerName', 'owner']),
  },
  {
    header: 'Mobile',
    accessor: (row) => pickFirstValue(row, ['mobileNo', 'mobile']),
  },
  {
    header: 'Approved',
    accessor: (row) =>
      typeof row.isApproved === 'boolean'
        ? row.isApproved
        : normalizeBool(pickFirstValue(row, ['approved'])),
    formatter: (value) => (normalizeBool(value) ? 'Yes' : 'No'),
  },
  {
    header: 'Status',
    accessor: (row) =>
      typeof row.isClose === 'boolean'
        ? !row.isClose
        : normalizeBool(pickFirstValue(row, ['status'])),
    formatter: (value) => (normalizeBool(value) ? 'Active' : 'Inactive'),
  },
]
