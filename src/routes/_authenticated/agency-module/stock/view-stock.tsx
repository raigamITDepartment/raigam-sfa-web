import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { ComingSoon } from '@/components/coming-soon'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/stock/view-stock')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.SeniorManagerSales, RoleId.ManagerSales, RoleId.ExecutiveSales, RoleId.OperationCompany]),
  component: () => (
    <Main>
      <PageHeader
        title='View Stock'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Stock' },
          { label: 'View Stock' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})

