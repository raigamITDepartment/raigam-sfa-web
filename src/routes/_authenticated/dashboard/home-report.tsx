import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  getHomeReportData,
  type HomeReportParams,
} from '@/services/reports/homeReportApi'
import { Card } from '@/components/ui/card'
import { CommonAlert } from '@/components/common-alert'
import Filters from '@/components/home-report/filters'
import HomeReportTable from '@/components/home-report/table'
import TableSkeleton from '@/components/home-report/table-skeleton'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

const formatMonthYear = (month: number, year: number) => {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

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

  const readyToFetch = Boolean(
    params?.subChannelId && params?.month && params?.year
  )

  return (
    <Main>
      <PageHeader
        title='Home Report'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'dashboard' },
          { label: 'Home Report' },
        ]}
      />

      <Card className='mb-4 p-4 shadow-sm dark:bg-gray-950'>
        <Filters onApply={handleApply} />
      </Card>
      {!readyToFetch && !isFetching && !isError && (
        <CommonAlert
          variant='info'
          title='Apply filters to view data'
          description='Select a sub-channel and month, then Apply to load data. Optionally filter by area or range.'
          className='mb-3'
        />
      )}
      {(isFetching || isError || data) && (
        <Card className='round-md overflow-auto p-2'>
          {isFetching && (
            <div className='p-2'>
              <TableSkeleton
                headerCols={16}
                rows={data?.payload?.length ?? 10}
              />
            </div>
          )}
          {isError && <div>Failed to load data</div>}
          {data && (
            <HomeReportTable
              items={data.payload}
              periodLabel={
                params?.month && params?.year
                  ? formatMonthYear(params.month, params.year)
                  : undefined
              }
            />
          )}
        </Card>
      )}
    </Main>
  )
}
