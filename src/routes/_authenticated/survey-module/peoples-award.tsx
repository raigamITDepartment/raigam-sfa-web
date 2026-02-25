import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute(
  '/_authenticated/survey-module/peoples-award'
)({
  component: () => (
    <Main>
      <PageHeader
        title="People's Award"
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Survey Module' },
          { label: "People's Award" },
        ]}
      />
      <div className='p-4 md:p-6'></div>
    </Main>
  ),
})
