import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/admin-module/user-module/add-modifiy-user')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: () => (
    <Main>
      <PageHeader title='Add / Modify User' description='Add page description' />
      <div>Admin Module - User Module - Add/Modifiy User</div>
    </Main>
  ),
})

