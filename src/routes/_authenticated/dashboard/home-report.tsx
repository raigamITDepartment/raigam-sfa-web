import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import Filters from '@/components/home-report/filters'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/dashboard/home-report')({
  component: HomeReportPage,
})

function HomeReportPage() {
  return (
    <Main>
      <PageHeader
        title='Home Report'
        description='Channel/territory day-wise summary'
      />
      <div className='gird mb-4 columns-8'>
        <Filters />
      </div>
      <Card className='overflow-auto p-2'></Card>
    </Main>
  )
}
