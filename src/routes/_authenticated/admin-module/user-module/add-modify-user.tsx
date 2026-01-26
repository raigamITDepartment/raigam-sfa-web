import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { PaginationState, SortingState, VisibilityState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  addUser,
  getAllUsers,
  updateUser,
  userActivation,
} from '@/services/users/userApi'
import type {
  AddUserRequest,
  GetAllUsersResponse,
  UpdateUserRequest,
  UserDemarcationUser,
} from '@/types/users'
import { useAppSelector } from '@/store/hooks'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommonAlert } from '@/components/common-alert'
import { CommonDialog } from '@/components/common-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTablePagination,
  DataTableToolbar,
  TableLoadingRows,
} from '@/components/data-table'
import { ExcelExportButton } from '@/components/excel-export-button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import {
  UserForm,
  type UserFormMode,
  type UserFormValues,
} from '@/components/user-module/UserForm'
import { createUserColumns } from '@/components/user-module/user-list-columns'
import { createUserExportColumns } from '@/components/user-module/user-list-export'

export const Route = createFileRoute(
  '/_authenticated/admin-module/user-module/add-modify-user'
)({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: AddModifyUser,
})

function AddModifyUser() {
  const queryClient = useQueryClient()
  const currentUser = useAppSelector((state) => state.auth.user)
  const canToggleUserStatus =
    currentUser?.userGroupId === RoleId.SystemAdmin &&
    currentUser?.userId != null
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user-demarcation', 'users'],
    queryFn: getAllUsers,
  })

  const rows = useMemo(() => data?.payload ?? [], [data])
  const roleFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((user) => {
      const groupName =
        user.userGroupName?.trim() ||
        (user.subRoleName ? user.roleName?.trim() : undefined)
      if (groupName) seen.add(groupName)
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
        columnId: 'userGroupName',
        title: 'User Group Name',
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
        userGroupId: values.userGroupId,
        roleId: values.roleId,
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
        userGroupId: values.userGroupId,
        roleId: values.roleId,
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

  const columns = useMemo(
    () =>
      createUserColumns({
        currentUserId: currentUser?.userId,
        canToggleUserStatus,
        onEdit: (user) => {
          setUserDialogMode('edit')
          setEditingUser(user)
          setUserDialogOpen(true)
        },
        onToggle: (payload) => {
          setPendingToggle(payload)
          setConfirmOpen(true)
        },
      }),
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
  const exportColumns = useMemo(() => createUserExportColumns(), [])

  const totalCount = table.getPreFilteredRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const countLabel = isLoading ? '.../...' : `${filteredCount}/${totalCount}`

  const userFormInitialValues = useMemo<Partial<UserFormValues> | undefined>(
    () => {
      if (!editingUser) return undefined
      const resolvedGroupId =
        editingUser.userGroupId ?? editingUser.roleId
      const resolvedRoleId =
        editingUser.userGroupId != null
          ? editingUser.roleId
          : editingUser.subRoleId
      return {
        userName: editingUser.userName,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        mobileNo: editingUser.mobileNo,
        userGroupId: resolvedGroupId,
        roleId: resolvedRoleId,
      }
    },
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
