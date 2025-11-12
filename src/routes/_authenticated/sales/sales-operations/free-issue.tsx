import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/sales/sales-operations/free-issue')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ManagerSales, RoleId.ExecutiveCompany]),
  component: () => (
    <Main>
      <PageHeader title='Free Issue' description='Add page description' />
      <div>Sales Operations - Free Issue</div>
    </Main>
  ),
})

