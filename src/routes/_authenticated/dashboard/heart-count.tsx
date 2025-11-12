import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/dashboard/heart-count')({
  component: () => (
    <Main>
      <PageHeader title='Heart Count' description='Add page description' />
      <div>Heart Count</div>
    </Main>
  ),
})
