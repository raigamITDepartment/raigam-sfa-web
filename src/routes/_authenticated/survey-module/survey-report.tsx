import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { SurveyReport } from '@/components/survey/SurveyReport'

export const Route = createFileRoute('/_authenticated/survey-module/survey-report')({
  component: () => (
    <Main>
      <PageHeader
        title='Survey Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Survey Module' },
          { label: 'Survey Report' },
        ]}
      />
      <div className='mt-4'>
        <SurveyReport />
      </div>
    </Main>
  ),
})
