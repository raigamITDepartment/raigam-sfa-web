import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import TerritoryWiseItemsReport from '@/components/reports/territory-wise-items-report'

export const Route = createFileRoute('/_authenticated/reports/territory-wise-items-report')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ExecutiveCompany, RoleId.ManagerSales]),
  component: () => (
    <Main>
      <PageHeader
        title='Territory Wise Items Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Territory Wise Items Report' },
        ]}
      />
      <TerritoryWiseItemsReport />
    </Main>
  ),
})

