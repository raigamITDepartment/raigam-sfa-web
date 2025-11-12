import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/stock/view-stock')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.SeniorManagerSales, RoleId.ManagerSales, RoleId.ExecutiveSales, RoleId.OperationCompany]),
  component: () => (
    <Main>
      <PageHeader title='View Stock' description='Add page description' />
      <div>Agency Module - Stock - View Stock</div>
    </Main>
  ),
})

