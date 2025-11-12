import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/reports/achievement-category-wise')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ExecutiveCompany, RoleId.ManagerSales]),
  component: () => (
    <Main>
      <PageHeader title='Achievement Category Wise' description='Add page description' />
      <div>Reports - Achievement Category Wise</div>
    </Main>
  ),
})

