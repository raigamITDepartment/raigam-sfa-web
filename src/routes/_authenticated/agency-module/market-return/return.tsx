import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/agency-module/market-return/return')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader
        title='Market Return'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Market Return' },
          { label: 'Return' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})

