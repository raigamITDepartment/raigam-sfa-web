import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  getHomeReportData,
  type HomeReportParams,
} from '@/services/reports/homeReportApi'
import { Card } from '@/components/ui/card'
import Filters from '@/components/home-report/filters'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/dashboard/home-report')({
  component: HomeReportPage,
})

function HomeReportPage() {
  const [params, setParams] = useState<HomeReportParams | null>(null)

  const { data, isFetching, isError } = useQuery({
    queryKey: ['home-report', params],
    queryFn: async () => {
      const res = await getHomeReportData(params as HomeReportParams)
      return res
    },
    enabled: Boolean(params?.subChannelId && params?.month && params?.year),
  })

  const handleApply = (payload: HomeReportParams) => {
    setParams(payload)
  }

  return (
    <Main>
      <div className='rounded-md bg-white p-4'>
        <PageHeader
          title='Home Report'
          description='Channel/territory day-wise summary'
        />

        <div className='gird mb-4 columns-8'>
          <Filters onApply={handleApply} />
        </div>
        <Card className='overflow-auto p-2'>
          {isFetching && <div>Loading...</div>}
          {isError && <div>Failed to load data</div>}
          {data && (
            <div>
              <div>Rows: {data.payload.length}</div>
            </div>
          )}
        </Card>
      </div>
    </Main>
  )
}
