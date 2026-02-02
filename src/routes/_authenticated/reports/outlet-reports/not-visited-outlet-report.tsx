import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import NotVisitedOutletReport from '@/components/reports/outlet-reports/NotVisitedOutletReport'

export const Route = createFileRoute(
  '/_authenticated/reports/outlet-reports/not-visited-outlet-report'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.TopManager,
      RoleId.ExecutiveCompany,
      RoleId.ManagerSales,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Not Visited Outlet Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Outlet Reports' },
          { label: 'Not Visited Outlet Report' },
        ]}
      />
      <NotVisitedOutletReport />
    </Main>
  ),
})
