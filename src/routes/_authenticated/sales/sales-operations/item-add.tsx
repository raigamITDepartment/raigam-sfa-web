import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

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
      <div>Sales Operations - Item Add</div>
    </Main>
  ),
})

