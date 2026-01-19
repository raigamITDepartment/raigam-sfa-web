import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import ItemSummaryReport from '@/components/reports/item-reports/ItemSummaryReport'

export const Route = createFileRoute(
  '/_authenticated/reports/item-reports/item-summary-report',
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
        title='Item Summary Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Item Summary Report' },
        ]}
      />
      <ItemSummaryReport />
    </Main>
  ),
})
