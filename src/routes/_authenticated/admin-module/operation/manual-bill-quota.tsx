import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/admin-module/operation/manual-bill-quota')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: () => (
    <Main>
      <PageHeader
        title='Manual Bill Quota'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Admin Module' },
          { label: 'Operation' },
          { label: 'Manual Bill Quota' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})

