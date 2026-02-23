import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import AddItem from '@/components/sales/sales-operations/item-master/AddItem'

export const Route = createFileRoute('/_authenticated/sales/sales-operations/item-add')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ManagerSales, RoleId.ExecutiveCompany]),
  component: () => (
    <Main>
      <PageHeader
        title='Item Add'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Operations' },
          { label: 'Item Add' },
        ]}
      />
      <div className='mt-4'>
        <AddItem />
      </div>
    </Main>
  ),
})

