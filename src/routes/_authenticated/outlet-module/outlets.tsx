import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { OutletList } from '@/components/outlet-module/OutletList'

export const Route = createFileRoute('/_authenticated/outlet-module/outlets')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ManagerSales,
      RoleId.ExecutiveSales,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Outlets'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Outlet Module' },
          { label: 'Outlets' },
        ]}
      />
      <div className='mt-4'>
        <OutletList />
      </div>
    </Main>
  ),
})
