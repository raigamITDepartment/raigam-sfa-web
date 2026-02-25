import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { FormBuild } from '@/components/survey/FormBuild'

export const Route = createFileRoute(
  '/_authenticated/survey-module/survey-form-builder'
)({
  component: () => (
    <Main>
      <PageHeader
        title='Surey Form build'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Survey Module' },
          { label: 'Surey Form build' },
        ]}
      />
      <div className='mt-4'>
        <FormBuild />
      </div>
    </Main>
  ),
})
