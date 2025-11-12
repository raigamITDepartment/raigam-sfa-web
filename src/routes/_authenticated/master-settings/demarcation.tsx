import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/master-settings/demarcation')({
  component: () => (
    <Main>
      <PageHeader title='Demarcation' description='Add page description' />
      <div>Demarcation</div>
    </Main>
  ),
})
