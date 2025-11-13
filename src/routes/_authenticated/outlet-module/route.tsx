import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/outlet-module')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ExecutiveSales,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Route'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Outlet Module' },
          { label: 'Route' },
        ]}
      />
      <div>Outlet Module - Route</div>
    </Main>
  ),
})

