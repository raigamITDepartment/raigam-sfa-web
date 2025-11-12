import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/admin-module/operation/reverse-requests')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: () => (
    <Main>
      <PageHeader title='Reverse Requests' description='Add page description' />
      <div>Admin Module - Operation - Reverse Requests</div>
    </Main>
  ),
})

