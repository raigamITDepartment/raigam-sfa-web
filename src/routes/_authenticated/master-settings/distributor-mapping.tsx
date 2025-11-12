import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/master-settings/distributor-mapping')({
  component: () => (
    <Main>
      <PageHeader title='Distributor Mapping' description='Add page description' />
      <div>Distributor Mapping</div>
    </Main>
  ),
})
