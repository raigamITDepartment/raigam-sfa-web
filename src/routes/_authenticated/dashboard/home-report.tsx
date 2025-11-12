import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/dashboard/home-report')({
  component: () => (
    <Main>
      <PageHeader title='Home Report' description='Add page description' />
    </Main>
  ),
})
