import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import ViewItemRangeWise from '@/components/sales/sales-details/ViewItemRangeWise'

export const Route = createFileRoute(
  '/_authenticated/sales/sales-details/view-item-range-wise'
)({
  component: () => (
    <Main>
      <PageHeader
        title='View Item Range Wise'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Sales' },
          { label: 'Sales Details' },
          { label: 'View Item Range Wise' },
        ]}
      />
      <div className='mt-4'>
        <ViewItemRangeWise />
      </div>
    </Main>
  ),
})
