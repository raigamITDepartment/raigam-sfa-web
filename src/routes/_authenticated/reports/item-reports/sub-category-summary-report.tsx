import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import SubCategorySummaryReport from '@/components/reports/item-reports/SubCategorySummaryReport'

export const Route = createFileRoute(
  '/_authenticated/reports/item-reports/sub-category-summary-report',
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
        title='Sub Category Summary Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Sub Category Summary Report' },
        ]}
      />
      <SubCategorySummaryReport />
    </Main>
  ),
})
