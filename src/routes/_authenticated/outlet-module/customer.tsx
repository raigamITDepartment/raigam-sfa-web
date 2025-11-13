import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/outlet-module/customer')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ExecutiveSales,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Customer (Outlet)'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Outlet Module' },
          { label: 'Customer (Outlet)' },
        ]}
      />
      <div>Outlet Module - Customer (Outlet)</div>
    </Main>
  ),
})
