import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import ManageCategory from '@/components/sales/sales-operations/ManageCategory'

export const Route = createFileRoute(
  '/_authenticated/sales/sales-operations/manage-category'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.TopManager,
      RoleId.ManagerSales,
      RoleId.ExecutiveCompany,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Manage Category'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Operations' },
          { label: 'Manage Category' },
        ]}
      />
      <div className='mt-4'>
        <ManageCategory />
      </div>
    </Main>
  ),
})
