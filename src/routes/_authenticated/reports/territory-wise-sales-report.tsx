import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/reports/territory-wise-sales-report')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ExecutiveCompany, RoleId.ManagerSales]),
  component: () => (
    <Main>
      <PageHeader
        title='Territory Wise Sales Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Reports' },
          { label: 'Territory Wise Sales Report' },
        ]}
      />
      <div>Reports - Territory Wise Sales Report</div>
    </Main>
  ),
})

