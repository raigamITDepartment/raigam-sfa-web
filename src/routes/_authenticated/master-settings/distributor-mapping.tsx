import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/master-settings/distributor-mapping')({
  component: () => (
    <Main>
      <PageHeader
        title='Distributor Mapping'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Master Settings' },
          { label: 'Distributor Mapping' },
        ]}
      />
      <div>Distributor Mapping</div>
    </Main>
  ),
})
