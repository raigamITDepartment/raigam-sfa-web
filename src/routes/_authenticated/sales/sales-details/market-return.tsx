import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/sales/sales-details/market-return')({
  component: () => (
    <Main>
      <PageHeader
        title='Market Return'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Details' },
          { label: 'Market Return' },
        ]}
      />
      <div>Sales Details - Market Return</div>
    </Main>
  ),
})
