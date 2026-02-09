import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import TerritoryWiseInvoiceSummaryReport from '@/components/reports/invoice-reports/TerritoryWiseInvoiceSummaryReport'

function TerritoryWiseInvoiceSummaryPage() {
  return (
    <Main>
      <PageHeader
        title='Territory Wise Invoice Summary'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Invoice Reports' },
          { label: 'Territory Wise Invoice Summary' },
        ]}
      />
      <div className='mt-4'>
        <TerritoryWiseInvoiceSummaryReport />
      </div>
    </Main>
  )
}

export const Route = createFileRoute(
  '/_authenticated/reports/invoice-reports/territory-wise-invoice-summary'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.TopManager,
      RoleId.ExecutiveCompany,
      RoleId.ManagerSales,
    ]),
  component: TerritoryWiseInvoiceSummaryPage,
})
