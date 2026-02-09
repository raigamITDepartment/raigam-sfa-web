import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import OutletSaleSummaryReport from '@/components/reports/outlet-reports/OutletSaleSummaryReport'

export const Route = createFileRoute(
  '/_authenticated/reports/outlet-reports/outlet-sale-summary-report'
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
        title='Outlet Sale Summary Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Outlet Reports' },
          { label: 'Outlet Sale Summary Report' },
        ]}
      />
      <OutletSaleSummaryReport />
    </Main>
  ),
})
