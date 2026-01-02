import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ComingSoon } from '@/components/coming-soon'

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
      <PageHeader
        title='GPS Monitoring'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'HR Module' },
          { label: 'GPS Monitoring' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})

