import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import WorkingDays from '@/components/sales/sales-operations/working-days/WorkingDays'

export const Route = createFileRoute('/_authenticated/sales/sales-operations/working-day')({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin, RoleId.TopManager, RoleId.ManagerSales, RoleId.ExecutiveCompany]),
  component: () => (
    <Main>
      <PageHeader
        title='Working Day'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Operations' },
          { label: 'Working Day' },
        ]}
      />
      <div className='mt-4'>
        <WorkingDays />
      </div>
    </Main>
  ),
})

