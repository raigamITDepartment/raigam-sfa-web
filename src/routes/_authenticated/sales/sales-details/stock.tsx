import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/sales/sales-details/stock')({
  component: () => (
    <Main>
      <PageHeader
        title='Stock'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Details' },
          { label: 'Stock' },
        ]}
      />
      <ComingSoon />
    </Main>
  ),
})
