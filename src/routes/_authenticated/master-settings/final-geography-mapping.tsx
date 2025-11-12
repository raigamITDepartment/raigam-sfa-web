import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/master-settings/final-geography-mapping')({
  component: () => (
    <Main>
      <PageHeader title='Final Geography Mapping' description='Add page description' />
      <div>Final Geography Mapping</div>
    </Main>
  ),
})
