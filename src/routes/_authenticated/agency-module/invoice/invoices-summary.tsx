import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId, SubRoleId } from '@/lib/authz'
import InvoiceSummary from '@/components/agency-module/invoice-summary/InvoiceSummary'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute(
  '/_authenticated/agency-module/invoice/invoices-summary'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.OperationSales,
      SubRoleId.AreaSalesManager,
      SubRoleId.AreaSalesExecutive,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Invoices Summary'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Invoice' },
          { label: 'Invoices Summary' },
        ]}
      />
      <div className='mt-4'>
        <InvoiceSummary />
      </div>
    </Main>
  ),
})
