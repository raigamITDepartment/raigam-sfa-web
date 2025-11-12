import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/hr-module/time-attendance')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ExecutiveSales,
      RoleId.OperationCompany,
    ]),
  component: () => (
    <Main>
      <PageHeader title='Time Attendance' description='Add page description' />
      <div>HR Module - Time Attendance</div>
    </Main>
  ),
})

