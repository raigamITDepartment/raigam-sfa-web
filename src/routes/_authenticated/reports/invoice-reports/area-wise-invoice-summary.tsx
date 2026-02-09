import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import AreaWiseInvoiceSummary from '@/components/reports/invoice-reports/AreaWiseInvoiceSummary'

export const Route = createFileRoute(
  '/_authenticated/reports/invoice-reports/area-wise-invoice-summary'
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
        title='Area Wise Invoice Summary'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Invoice Reports' },
          { label: 'Area Wise Invoice Summary' },
        ]}
      />
      <AreaWiseInvoiceSummary />
    </Main>
  ),
})
