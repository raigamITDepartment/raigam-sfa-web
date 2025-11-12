import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/sales/sales-details/view-item-range-wise')({
  component: () => (
    <Main>
      <PageHeader title='View Item Range Wise' description='Add page description' />
      <div>Sales Details - View Item Range Wise</div>
    </Main>
  ),
})
