import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getHomeReportData } from '@/services/reports/homeReportApi'
import type { HomeReportParams, HomeReportResponse } from '@/types/home-report'
import { Card } from '@/components/ui/card'
import { CommonAlert } from '@/components/common-alert'
import Filters, {
  type FiltersPayload,
} from '@/components/dashboard/home-report/filters'
import HomeReportTable from '@/components/dashboard/home-report/table'
import TableSkeleton from '@/components/dashboard/home-report/table-skeleton'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

const DEFAULT_ROWS_PER_PAGE = 10

const formatMonthYear = (month: number, year: number) => {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const Route = createFileRoute('/_authenticated/dashboard/home-report')({
  component: HomeReportPage,
  validateSearch: (search: Record<string, unknown>) => ({
    subChannelId:
      typeof search.subChannelId === 'string'
        ? Number(search.subChannelId)
        : typeof search.subChannelId === 'number'
          ? search.subChannelId
          : undefined,
    rangeId:
      typeof search.rangeId === 'string'
        ? Number(search.rangeId)
        : typeof search.rangeId === 'number'
          ? search.rangeId
          : undefined,
    areaId:
      typeof search.areaId === 'string'
        ? Number(search.areaId)
        : typeof search.areaId === 'number'
          ? search.areaId
          : 0,
    year:
      typeof search.year === 'string'
        ? Number(search.year)
        : typeof search.year === 'number'
          ? search.year
          : undefined,
    month:
      typeof search.month === 'string'
        ? Number(search.month)
        : typeof search.month === 'number'
          ? search.month
          : undefined,
  }),
})

function HomeReportPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  const FILTER_STORAGE_KEY = 'home-report-filters'

  const params: HomeReportParams = {
    subChannelId: search.subChannelId,
    rangeId: search.rangeId,
    areaId: search.areaId ?? 0,
    year: search.year,
    month: search.month,
  }

  const readyToFetch = Boolean(
    params?.subChannelId && params?.rangeId && params?.month && params?.year
  )

  useEffect(() => {
    // On first mount, if no search params, hydrate from localStorage (if present).
    if (readyToFetch) return
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as HomeReportParams
      if (
        !parsed ||
        !parsed.subChannelId ||
        !parsed.rangeId ||
        !parsed.month ||
        !parsed.year
      )
        return
      navigate({
        to: '/dashboard/home-report',
        search: {
          subChannelId: parsed.subChannelId,
          rangeId: parsed.rangeId,
          areaId: parsed.areaId ?? 0,
          year: parsed.year,
          month: parsed.month,
        },
        replace: true,
      })
    } catch {
      /* noop */
    }
  }, [navigate, readyToFetch])

  const { data, isFetching, isError } = useQuery<HomeReportResponse>({
    queryKey: [
      'home-report',
      params.subChannelId ?? null,
      params.rangeId ?? null,
      params.areaId ?? null,
      params.year ?? null,
      params.month ?? null,
    ],
    queryFn: async () => {
      const res = await getHomeReportData(params as HomeReportParams)
      return res
    },
    enabled: Boolean(
      params?.subChannelId && params?.rangeId && params?.month && params?.year
    ),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 30, // keep cached for 30 minutes after unmount
    refetchOnWindowFocus: false,
    placeholderData: undefined,
  })

  // Avoid showing stale table data while a new fetch is in-flight.
  const isLoading = isFetching
  const showTable = !isLoading && Boolean(data)

  const handleApply = (payload: FiltersPayload) => {
    // Persist filters so returning to the route can rehydrate without refetch delay.
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          subChannelId: payload.subChannelId,
          rangeId: payload.rangeId,
          areaId: payload.areaId ?? 0,
          year: payload.year,
          month: payload.month,
        })
      )
    } catch {
      /* noop */
    }

    navigate({
      to: '/dashboard/home-report',
      search: {
        subChannelId: payload.subChannelId,
        rangeId: payload.rangeId,
        areaId: payload.areaId ?? 0,
        year: payload.year,
        month: payload.month,
      },
    })
  }

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
        <Filters onApply={handleApply} initialValues={params} />
      </Card>
      {!readyToFetch && !isFetching && !isError && (
        <CommonAlert
          variant='info'
          title='Apply filters to view data'
          description='Select a sub-channel and month, then Apply to load data. Optionally filter by area or range.'
          className='mb-3'
        />
      )}
      {(isFetching || isError || Boolean(data)) && (
        <Card className='round-md overflow-auto p-2'>
          {isLoading && (
            <div className='p-2'>
              <TableSkeleton
                headerCols={16}
                rows={Math.min(
                  data?.payload?.length ?? DEFAULT_ROWS_PER_PAGE,
                  DEFAULT_ROWS_PER_PAGE
                )}
              />
            </div>
          )}
          {isError && <div>Failed to load data</div>}
          {showTable && data && (
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
