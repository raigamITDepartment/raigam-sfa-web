import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/hr-module/gps-monitoring')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ExecutiveSales,
      RoleId.OperationCompany,
    ]),
  component: () => (
    <Main>
      <PageHeader title='GPS Monitoring' description='Add page description' />
      <div>HR Module - GPS Monitoring</div>
    </Main>
  ),
})

