import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserDemarcationUser } from '@/types/users'
import { formatText, formatUserFullName, getInitials } from './user-list-utils'

type UserColumnsOptions = {
  currentUserId?: number | null
  canToggleUserStatus: boolean
  onEdit: (user: UserDemarcationUser) => void
  onToggle: (payload: {
    id: number
    userName: string
    nextActive: boolean
  }) => void
}

export const createUserColumns = ({
  currentUserId,
  canToggleUserStatus,
  onEdit,
  onToggle,
}: UserColumnsOptions): ColumnDef<UserDemarcationUser>[] => [
  {
    id: 'avatar',
    header: () => <span className='sr-only'>Avatar</span>,
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className='pl-4'>
          <Avatar className='size-9 border border-sky-200 bg-sky-50'>
            <AvatarFallback className='text-xs font-semibold text-sky-700'>
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
        </div>
      )
    },
    enableSorting: false,
    meta: { thClassName: 'w-[80px]' },
  },
  {
    accessorKey: 'userName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Username' />
    ),
    cell: ({ row }) => (
      <span className='pl-4'>{formatText(row.getValue('userName'))}</span>
    ),
  },
  {
    accessorKey: 'roleName',
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
      <DataTableColumnHeader column={column} title='Role Name' />
    ),
    cell: ({ row }) => (
      <span className='pl-4'>{formatText(row.getValue('roleName'))}</span>
    ),
  },
  {
    accessorKey: 'subRoleName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Sub Role Name' />
    ),
    cell: ({ row }) => (
      <span className='pl-4'>{formatText(row.getValue('subRoleName'))}</span>
    ),
  },
  {
    id: 'fullName',
    accessorFn: (row) => formatUserFullName(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Full Name' />
    ),
    cell: ({ row }) => {
      const fullName = formatUserFullName(row.original)
      return <span className='pl-4 capitalize'>{formatText(fullName)}</span>
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <span className='pl-4'>{formatText(row.getValue('email'))}</span>
    ),
  },
  {
    id: 'status',
    accessorFn: (row) => (row.isActive ? 'Active' : 'Inactive'),
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
      const user = row.original
      const isActive = Boolean(user.isActive)
      return (
        <div className='pl-4'>
          <Badge
            variant={isActive ? 'secondary' : 'outline'}
            className={
              isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      )
    },
    meta: { thClassName: 'w-[130px]' },
  },
  {
    id: 'actions',
    header: () => <div className='pr-4 text-right'>Actions</div>,
    cell: ({ row }) => {
      const user = row.original
      const isActive = Boolean(user.isActive)
      const isSelf =
        currentUserId != null && String(user.id) === String(currentUserId)
      const toggleDisabled = !canToggleUserStatus || isSelf
      const toggleLabel = toggleDisabled
        ? isSelf
          ? 'Cannot change your own status'
          : 'Only System Admin can change user status'
        : undefined
      return (
        <div className='flex items-center justify-end gap-1 pr-4'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Edit user'
                onClick={() => onEdit(user)}
              >
                <Pencil className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Switch
            disabled={toggleDisabled}
            checked={isActive}
            onCheckedChange={(value) => {
              if (toggleDisabled) return
              onToggle({
                id: user.id,
                userName: user.userName ?? '',
                nextActive: value,
              })
            }}
            title={toggleLabel}
            aria-label={isActive ? 'Deactivate user' : 'Activate user'}
          />
        </div>
      )
    },
    enableSorting: false,
    meta: { thClassName: 'w-[140px] text-right' },
  },
]
