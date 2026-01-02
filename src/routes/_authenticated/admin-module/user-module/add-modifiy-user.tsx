import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/admin-module/user-module/add-modifiy-user')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: () => (
    <Main>
      <PageHeader
        title='Add / Modify User'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Admin Module' },
          { label: 'User Module' },
          { label: 'Add / Modify User' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})

