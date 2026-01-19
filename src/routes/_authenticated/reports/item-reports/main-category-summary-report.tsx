import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import MainCategorySummaryReport from '@/components/reports/item-reports/MainCategorySummaryReport'

export const Route = createFileRoute(
  '/_authenticated/reports/item-reports/main-category-summary-report',
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
        title='Main Category Summary Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Main Category Summary Report' },
        ]}
      />
      <MainCategorySummaryReport />
    </Main>
  ),
})
