import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/master-settings/final-geography-mapping')({
  component: () => (
    <Main>
      <PageHeader
        title='Final Geography Mapping'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Master Settings' },
          { label: 'Final Geography Mapping' },
        ]}
      />
      <div>Final Geography Mapping</div>
    </Main>
  ),
})
