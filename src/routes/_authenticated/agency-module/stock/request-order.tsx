import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/stock/request-order')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.SeniorManagerSales, RoleId.ManagerSales, RoleId.ExecutiveSales, RoleId.OperationCompany]),
  component: () => (
    <Main>
      <PageHeader
        title='Request Order'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Stock' },
          { label: 'Request Order' },
        ]}
      />
      <div>Agency Module - Stock - Request Order</div>
    </Main>
  ),
})

