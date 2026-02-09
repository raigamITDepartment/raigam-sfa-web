import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import ManualInvoice from '@/components/agency-module/ManualInvoice'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute(
  '/_authenticated/agency-module/invoice/manual-invoice'
)({
  beforeLoad: () =>
    ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader
        title='Manual Invoice'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Invoice' },
          { label: 'Manual Invoice' },
        ]}
      />
      <div className='mt-4'>
        <ManualInvoice />
      </div>
    </Main>
  ),
})
