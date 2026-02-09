import type { ExcelExportColumn } from '@/components/excel-export-button'
import type { UserDemarcationUser } from '@/types/users'
import { formatUserFullName } from './user-list-utils'

export const createUserExportColumns = (): ExcelExportColumn<UserDemarcationUser>[] => [
  { header: 'Username', accessor: (row) => row.userName },
  {
    header: 'User Group Name',
    accessor: (row) =>
      row.userGroupName ?? (row.subRoleName ? row.roleName : undefined) ?? '-',
  },
  {
    header: 'Role Name',
    accessor: (row) => row.roleName ?? row.subRoleName ?? '-',
  },
  {
    header: 'Full Name',
    accessor: (row) => formatUserFullName(row) || '-',
  },
  { header: 'Email', accessor: (row) => row.email },
  {
    header: 'Status',
    accessor: (row) => (row.isActive ? 'Active' : 'Inactive'),
  },
]
