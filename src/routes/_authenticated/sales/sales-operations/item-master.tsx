import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import ItemMaster from '@/components/sales/sales-operations/item-master/ItemMaster'

export const Route = createFileRoute('/_authenticated/sales/sales-operations/item-master')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ManagerSales, RoleId.ExecutiveCompany]),
  component: () => (
    <Main>
      <PageHeader
        title='Item Master'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Operations' },
          { label: 'Item Master' },
        ]}
      />
      <div className='mt-4'>
        <ItemMaster />
      </div>
    </Main>
  ),
})

