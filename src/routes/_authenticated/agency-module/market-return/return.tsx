import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/market-return/return')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader title='Market Return' description='Add page description' />
      <div>Agency Module - Market Return - Return</div>
    </Main>
  ),
})

