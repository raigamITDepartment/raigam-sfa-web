import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import SubTwoCategorySummaryReport from '@/components/reports/item-reports/SubTwoCategorySummaryReport'

export const Route = createFileRoute(
  '/_authenticated/reports/item-reports/sub-two-category-summary-report',
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
        title='Sub Two Category Summary Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Sub Two Category Summary Report' },
        ]}
      />
      <SubTwoCategorySummaryReport />
    </Main>
  ),
})
