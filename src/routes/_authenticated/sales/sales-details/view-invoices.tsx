import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/sales/sales-details/view-invoices')({
  component: () => (
    <Main>
      <PageHeader
        title='View Invoices'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Details' },
          { label: 'View Invoices' },
        ]}
      />
      <div>Sales Details - View Invoices</div>
    </Main>
  ),
})
