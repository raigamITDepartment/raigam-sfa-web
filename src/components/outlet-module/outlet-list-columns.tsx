import type { ColumnDef } from '@tanstack/react-table'
import { BadgeCheck, Eye, Pencil } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate } from '@/lib/format-date'
import type { OutletRecord } from '@/types/outlet'
import { formatValue, normalizeBool, pickFirstValue } from './outlet-list-utils'

type OutletColumnsOptions = {
  onView: (record: OutletRecord) => void
  onEdit: (record: OutletRecord) => void
  onApprove: (record: OutletRecord) => void
  onToggleActive: (record: OutletRecord, nextActive: boolean) => void
  canEdit: boolean
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

export const createOutletColumns = ({
  onView,
  onEdit,
  onApprove,
  onToggleActive,
  canEdit,
}: OutletColumnsOptions): ColumnDef<OutletRecord>[] => [
  {
    id: 'dealerCode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Dealer Code' />
    ),
    cell: ({ row }) => {
      const { agencyCode, routeCode, shopCode } = row.original
      const parts = [agencyCode, routeCode, shopCode].map((value) =>
        value === null || value === undefined || value === ''
          ? '-'
          : String(value)
      )
      return formatValue(parts.join('/'))
    },
  },
  {
    id: 'territoryName',
    accessorFn: (row) => row.territoryName,
    filterFn: (row, columnId, filterValue) =>
      matchesMultiSelect(row.getValue(columnId), filterValue),
    meta: { label: 'Territory' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Territory' />
    ),
    cell: ({ row }) => (
      <span className='capitalize'>
        {formatValue(row.original.territoryName)}
      </span>
    ),
  },
  {
    id: 'areaName',
    accessorFn: (row) =>
      pickFirstValue(row, ['areaName', 'rangeName', 'range']),
    filterFn: (row, columnId, filterValue) =>
      matchesMultiSelect(row.getValue(columnId), filterValue),
    meta: { label: 'Area' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Area' />
    ),
    cell: ({ row }) => (
      <span className='capitalize'>
        {formatValue(
          pickFirstValue(row.original, ['areaName', 'rangeName', 'range'])
        )}
      </span>
    ),
  },
  {
    id: 'name',
    accessorFn: (row) => pickFirstValue(row, ['outletName', 'name']),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <span className='pl-3 capitalize'>
        {formatValue(pickFirstValue(row.original, ['outletName', 'name']))}
      </span>
    ),
  },
  {
    id: 'created',
    accessorFn: (row) => row.created,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => formatDate(row.original.created),
  },
  {
    id: 'uniqueCode',
    accessorFn: (row) =>
      pickFirstValue(row, ['uniqueCode', 'outletCode', 'outletId', 'id']),
    meta: { label: 'Unique Code' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Unique Code' />
    ),
    cell: ({ row }) =>
      formatValue(
        pickFirstValue(row.original, [
          'uniqueCode',
          'outletCode',
          'outletId',
          'id',
        ])
      ),
  },
  {
    id: 'category',
    accessorFn: (row) =>
      pickFirstValue(row, ['outletCategoryName', 'outletCategory', 'category']),
    filterFn: (row, columnId, filterValue) =>
      matchesMultiSelect(row.getValue(columnId), filterValue),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ row }) =>
      formatValue(
        pickFirstValue(row.original, [
          'outletCategoryName',
          'outletCategory',
          'category',
        ])
      ),
  },
  {
    id: 'channelName',
    accessorFn: (row) => row.channelName,
    meta: { label: 'Channel' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Channel' />
    ),
    cell: ({ row }) => (
      <span className='capitalize'>
        {formatValue(row.original.channelName)}
      </span>
    ),
  },
  {
    id: 'route',
    accessorFn: (row) => row.routeName,
    filterFn: (row, columnId, filterValue) =>
      matchesMultiSelect(row.getValue(columnId), filterValue),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Route' />
    ),
    cell: ({ row }) => (
      <span className='capitalize'>
        {formatValue(row.original.routeName)}
      </span>
    ),
  },
  {
    id: 'owner',
    accessorFn: (row) => pickFirstValue(row, ['ownerName', 'owner']),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Owner' />
    ),
    cell: ({ row }) => (
      <span className='capitalize'>
        {formatValue(pickFirstValue(row.original, ['ownerName', 'owner']))}
      </span>
    ),
  },
  {
    id: 'mobile',
    accessorFn: (row) => pickFirstValue(row, ['mobileNo', 'mobile']),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Mobile' />
    ),
    cell: ({ row }) =>
      formatValue(pickFirstValue(row.original, ['mobileNo', 'mobile'])),
  },
  {
    id: 'approved',
    accessorFn: (row) =>
      typeof row.isApproved === 'boolean'
        ? row.isApproved
        : pickFirstValue(row, ['approved']),
    filterFn: (row, columnId, filterValue) => {
      const values = Array.isArray(filterValue)
        ? filterValue
        : filterValue
          ? [String(filterValue)]
          : []
      if (!values.length) return true
      const normalized = String(normalizeBool(row.getValue(columnId)))
      return values.includes(normalized)
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Approved' />
    ),
    cell: ({ row }) => {
      const isApproved =
        typeof row.original.isApproved === 'boolean'
          ? row.original.isApproved
          : normalizeBool(pickFirstValue(row.original, ['approved']))
      const classes = isApproved
        ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
        : 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
      return (
        <div className='flex w-full justify-center'>
          <Badge variant='secondary' className={classes}>
            {isApproved ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    },
  },
  {
    id: 'status',
    accessorFn: (row) =>
      typeof row.isClose === 'boolean'
        ? !row.isClose
        : pickFirstValue(row, ['status']),
    filterFn: (row, columnId, filterValue) => {
      const values = Array.isArray(filterValue)
        ? filterValue
        : filterValue
          ? [String(filterValue)]
          : []
      if (!values.length) return true
      const normalized = String(normalizeBool(row.getValue(columnId)))
      return values.includes(normalized)
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const isActive =
        typeof row.original.isClose === 'boolean'
          ? !row.original.isClose
          : normalizeBool(pickFirstValue(row.original, ['status']))
      const classes = isActive
        ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100'
        : 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
      return (
        <div className='flex w-full justify-center'>
          <Badge variant='secondary' className={classes}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className='pr-2 text-end'>Actions</div>,
    cell: ({ row }) => {
      const isApproved =
        typeof row.original.isApproved === 'boolean'
          ? row.original.isApproved
          : normalizeBool(pickFirstValue(row.original, ['approved']))
      const isActive =
        typeof row.original.isClose === 'boolean'
          ? !row.original.isClose
          : normalizeBool(pickFirstValue(row.original, ['status']))
      return (
        <div className='flex items-center justify-end gap-2 pr-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='View outlet'
                onClick={() => onView(row.original)}
              >
                <Eye className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>
          {canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  aria-label='Edit outlet'
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          ) : null}
          {!isApproved ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 gap-1.5'
                  onClick={() => onApprove(row.original)}
                  aria-label='Approve outlet'
                >
                  <BadgeCheck className='size-4' />
                  Approve
                </Button>
              </TooltipTrigger>
              <TooltipContent>Approve outlet</TooltipContent>
            </Tooltip>
          ) : null}
          <Switch
            checked={isActive}
            onCheckedChange={(value) => onToggleActive(row.original, value)}
            aria-label={isActive ? 'Deactivate outlet' : 'Activate outlet'}
            title={isActive ? 'Deactivate outlet' : 'Activate outlet'}
          />
        </div>
      )
    },
  },
]
