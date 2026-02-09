import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId, SubRoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { TimeAttendance } from '@/components/time-attendance/TimeAttendance'

export const Route = createFileRoute('/_authenticated/hr-module/time-attendance')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ManagerSales,
      RoleId.ExecutiveSales,
      RoleId.ExecutiveCompany,
      RoleId.OperationCompany,
      SubRoleId.AreaSalesManager,
      SubRoleId.RegionSalesManager,
      SubRoleId.CCU,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Time Attendance'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'HR Module' },
          { label: 'Time Attendance' },
        ]}
      />
      <TimeAttendance />
    </Main>
  ),
})

