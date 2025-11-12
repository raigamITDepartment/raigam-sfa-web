import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/sales/sales-details/stock')({
  component: () => (
    <Main>
      <PageHeader title='Stock' description='Add page description' />
      <div>Sales Details - Stock</div>
    </Main>
  ),
})
