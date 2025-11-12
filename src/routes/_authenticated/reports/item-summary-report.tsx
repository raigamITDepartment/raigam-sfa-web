import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/reports/item-summary-report')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ExecutiveCompany, RoleId.ManagerSales]),
  component: () => (
    <Main>
      <PageHeader title='Item Summary Report' description='Add page description' />
      <div>Reports - Item Summary Report</div>
    </Main>
  ),
})

