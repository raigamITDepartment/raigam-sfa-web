import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/agency-module/invoice/post-invoice')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader title='Post Invoice' description='Add page description' />
      <div>Agency Module - Invoice - Post Invoice</div>
    </Main>
  ),
})

