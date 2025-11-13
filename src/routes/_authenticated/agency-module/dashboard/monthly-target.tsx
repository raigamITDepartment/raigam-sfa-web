import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/dashboard/monthly-target')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader
        title='Monthly Target'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Dashboard' },
          { label: 'Monthly Target' },
        ]}
      />
      <div>Agency Module - Dashboard - Monthly Target</div>
    </Main>
  ),
})

