import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  getAllUsers,
  addUser,
  type AddUserRequest,
  type GetAllUsersResponse,
  type UpdateUserRequest,
  updateUser,
  userActivation,
  type UserDemarcationUser,
} from '@/services/users/userApi'
import { useAppSelector } from '@/store/hooks'
import { Pencil, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CommonAlert } from '@/components/common-alert'
import { CommonDialog } from '@/components/common-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import { ExcelExportButton, type ExcelExportColumn } from '@/components/excel-export-button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import {
  UserForm,
  type UserFormMode,
  type UserFormValues,
} from '@/components/user-module/UserForm'

export const Route = createFileRoute(
  '/_authenticated/admin-module/user-module/add-modify-user'
)({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: AddModifyUser,
})

const formatText = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text ? text : '-'
}

const getInitials = (user: UserDemarcationUser) => {
  const parts = [user.firstName, user.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
  const base = parts.length ? parts.join(' ') : (user.userName ?? '')
  const initials = base
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return initials || 'U'
}

function AddModifyUser() {
  const queryClient = useQueryClient()
  const currentUser = useAppSelector((state) => state.auth.user)
  const canToggleUserStatus =
    currentUser?.roleId === RoleId.SystemAdmin && currentUser?.userId != null
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user-demarcation', 'users'],
    queryFn: getAllUsers,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const roleFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((user) => {
      const roleName = user.roleName?.trim()
      if (roleName) seen.add(roleName)
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])
  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((user) => {
      seen.add(user.isActive ? 'Active' : 'Inactive')
    })
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [rows])
  const toolbarFilters = useMemo(
    () => [
      {
        columnId: 'roleName',
        title: 'Role Name',
        options: roleFilterOptions,
      },
      {
        columnId: 'status',
        title: 'Status',
        options: statusFilterOptions,
      },
    ],
    [roleFilterOptions, statusFilterOptions]
  )
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userDialogMode, setUserDialogMode] = useState<UserFormMode>('create')
  const [editingUser, setEditingUser] = useState<UserDemarcationUser | null>(
    null
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    id: number
    userName: string
    nextActive: boolean
  } | null>(null)
  const createMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload: AddUserRequest = {
        roleId: values.roleId,
        subRoleId: values.subRoleId,
        departmentId: null,
        continentId: null,
        countryId: null,
        channelId: null,
        subChannelId: null,
        regionId: null,
        areaId: null,
        territoryId: null,
        agencyId: null,
        userLevelId: 0,
        userName: values.userName,
        firstName: values.firstName,
        lastName: values.lastName,
        perContact: null,
        email: values.email,
        password: values.password ?? '',
        mobileNo: values.mobileNo,
        gpsStatus: false,
        isActive: true,
        superUserId: currentUser?.userId ?? null,
      }
      return addUser(payload)
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['user-demarcation', 'users'] })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create user'
      toast.error(message)
    },
  })
  const updateMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (!editingUser) {
        throw new Error('No user selected for update.')
      }
      const payload: UpdateUserRequest = {
        id: editingUser.id,
        roleId: values.roleId,
        subRoleId: values.subRoleId,
        userLevelId: editingUser.userLevelId,
        userName: values.userName,
        firstName: values.firstName,
        lastName: values.lastName,
        perContact: editingUser.perContact ?? null,
        startDate: editingUser.startDate ?? null,
        endDate: editingUser.endDate ?? null,
        email: values.email,
        password: values.password ?? '',
        mobileNo: values.mobileNo,
        gpsStatus: editingUser.gpsStatus ?? false,
        isActive: editingUser.isActive ?? true,
        superUserId: currentUser?.userId ?? editingUser.superUserId ?? null,
      }
      return updateUser(payload)
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-demarcation', 'users'] })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update user'
      toast.error(message)
    },
  })
  const toggleStatusMutation = useMutation({
    mutationFn: async (vars: { id: number; nextActive: boolean }) => {
      const response = await userActivation(vars.id)
      return { ...vars, response }
    },
    onSuccess: ({ id, nextActive, response }) => {
      queryClient.setQueryData<GetAllUsersResponse>(
        ['user-demarcation', 'users'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          return {
            ...old,
            payload: old.payload.map((user) => {
              if (String(user.id) !== String(id)) return user
              const payload = response?.payload
              const resolvedActive =
                (payload?.isActive as boolean | undefined) ?? nextActive
              return payload
                ? { ...user, ...payload, isActive: resolvedActive }
                : { ...user, isActive: resolvedActive }
            }),
          }
        }
      )
      toast.success(
        response?.message ??
          (nextActive
            ? 'User activated successfully'
            : 'User deactivated successfully')
      )
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update user status'
      toast.error(message)
    },
  })

  useEffect(() => {
    if (!userDialogOpen) {
      setUserDialogMode('create')
      setEditingUser(null)
    }
  }, [userDialogOpen])

  const columns = useMemo<ColumnDef<UserDemarcationUser>[]>(
    () => [
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
          <span className='pl-4'>
            {formatText(row.getValue('subRoleName'))}
          </span>
        ),
      },
      {
        id: 'fullName',
        accessorFn: (row) =>
          `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Full Name' />
        ),
        cell: ({ row }) => {
          const user = row.original
          const fullName =
            `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
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
            currentUser?.userId != null &&
            String(user.id) === String(currentUser.userId)
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
                    onClick={() => {
                      setUserDialogMode('edit')
                      setEditingUser(user)
                      setUserDialogOpen(true)
                    }}
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
                  setPendingToggle({
                    id: user.id,
                    userName: user.userName ?? '',
                    nextActive: value,
                  })
                  setConfirmOpen(true)
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
    ],
    [canToggleUserStatus, currentUser?.userId]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const exportRows = table.getSortedRowModel().rows.map((row) => row.original)
  const exportColumns = useMemo<ExcelExportColumn<UserDemarcationUser>[]>(() => {
    const formatFullName = (user: UserDemarcationUser) =>
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return [
      { header: 'Username', accessor: (row) => row.userName },
      { header: 'Role Name', accessor: (row) => row.roleName },
      { header: 'Sub Role Name', accessor: (row) => row.subRoleName },
      { header: 'Full Name', accessor: (row) => formatFullName(row) || '-' },
      { header: 'Email', accessor: (row) => row.email },
      {
        header: 'Status',
        accessor: (row) => (row.isActive ? 'Active' : 'Inactive'),
      },
    ]
  }, [])

  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const countLabel = isLoading ? '.../...' : `${filteredCount}/${totalCount}`

  const userFormInitialValues = useMemo<Partial<UserFormValues> | undefined>(
    () =>
      editingUser
        ? {
            userName: editingUser.userName,
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            mobileNo: editingUser.mobileNo,
            roleId: editingUser.roleId,
            subRoleId: editingUser.subRoleId,
          }
        : undefined,
    [editingUser]
  )

  return (
    <Main>
      <PageHeader
        title='Add / Modify User'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Admin Module' },
          { label: 'User Module' },
          { label: 'Add / Modify User' },
        ]}
      />

      <Card>
        <CardHeader className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-base font-semibold'>Users</CardTitle>
              <CountBadge value={countLabel} />
            </div>
            <p className='text-muted-foreground text-sm'>
              Manage user profiles and assignments.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <ExcelExportButton
              variant='outline'
              data={exportRows}
              columns={exportColumns}
              fileName='users'
              worksheetName='Users'
              disabled={!exportRows.length}
            />
            <Button
              variant='default'
              aria-label='Add user'
              onClick={() => {
                setUserDialogMode('create')
                setEditingUser(null)
                setUserDialogOpen(true)
              }}
            >
              <UserPlus className='mr-2 size-4' />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          <DataTableToolbar
            table={table}
            searchPlaceholder='Search users...'
            filters={toolbarFilters}
          />

          {isError ? (
            <CommonAlert
              variant='error'
              title='Unable to load users'
              description={(error as Error)?.message ?? 'Please try again.'}
            />
          ) : (
            <div className='rounded-md border'>
              <Table className='text-xs'>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            'h-10 bg-slate-100 px-2 ' +
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
                  {isLoading ? (
                    <TableLoadingRows columns={columns.length} rows={8} />
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className='p-2'>
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
                        className='text-muted-foreground h-24 text-center text-sm'
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DataTablePagination table={table} />
        </CardContent>
      </Card>
      <CommonDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        title={userDialogMode === 'create' ? 'Add User' : 'Update User'}
        description={
          userDialogMode === 'create'
            ? 'Create a new user profile.'
            : 'Update user details.'
        }
        contentClassName='max-w-xl'
        hideFooter
      >
        <UserForm
          mode={userDialogMode}
          initialValues={userFormInitialValues}
          onSubmit={async (values) => {
            if (userDialogMode === 'edit') {
              await updateMutation.mutateAsync(values)
              setUserDialogOpen(false)
              return
            }
            await createMutation.mutateAsync(values)
            setUserDialogOpen(false)
          }}
          onCancel={() => {
            setUserDialogOpen(false)
          }}
        />
      </CommonDialog>
      <ConfirmDialog
        destructive
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingToggle(null)
        }}
        title='Change user status?'
        desc={
          pendingToggle?.nextActive
            ? `Are you sure you want to activate this user${
                pendingToggle?.userName ? ` "${pendingToggle.userName}"` : ''
              }?`
            : `Are you sure you want to deactivate this user${
                pendingToggle?.userName ? ` "${pendingToggle.userName}"` : ''
              }?`
        }
        confirmText={
          pendingToggle?.nextActive ? 'Yes, activate' : 'Yes, deactivate'
        }
        cancelBtnText='No'
        isLoading={toggleStatusMutation.isPending}
        handleConfirm={() => {
          if (!pendingToggle) return
          toggleStatusMutation.mutate({
            id: pendingToggle.id,
            nextActive: pendingToggle.nextActive,
          })
          setConfirmOpen(false)
          setPendingToggle(null)
        }}
      />
    </Main>
  )
}
