import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import Achivement from '@/components/reports/achievement/Achivement'
import { ensureRoleAccess, RoleId } from '@/lib/authz'

export const Route = createFileRoute(
  '/_authenticated/reports/achievement-reports/generate-achievement-report'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.TopManager,
      RoleId.ExecutiveCompany,
      RoleId.ManagerSales,
    ]),
  component: () => (
    <Main>
      <PageHeader
        title='Generate Achievement Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Achievement reports' },
          { label: 'Generate Achievement Report' },
        ]}
      />
      <Achivement />
    </Main>
  ),
})
