import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react'
import Filters, {
  type FiltersPayload,
} from '@/components/dashboard/home-report/filters'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommonAlert } from '@/components/common-alert'
import { getHomeReportData } from '@/services/reports/homeReportApi'
import { getAllRange, getAllSubChannel } from '@/services/userDemarcationApi'
import type {
  HomeReportItem,
  HomeReportParams,
  HomeReportResponse,
} from '@/types/home-report'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

const DEFAULT_SUB_CHANNEL_LABEL = 'Bakery & horeca'
const DEFAULT_RANGE_LABEL = 'B'
const FILTER_STORAGE_KEY = 'home-report-filters'

const normalizeLabel = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '')
const normalizeMatch = (value: string) =>
  normalizeLabel(value).replace(/and/g, '')

const normalizeId = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function TopManagementOverview() {
  const user = useAppSelector((state) => state.auth.user)
  const [defaultsApplied, setDefaultsApplied] = useState(false)
  const [storageChecked, setStorageChecked] = useState(false)
  const [params, setParams] = useState<HomeReportParams>(() => {
    const now = new Date()
    return {
      subChannelId: undefined,
      rangeId: undefined,
      areaId: 0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    }
  })

  const subChannelsQuery = useQuery({
    queryKey: ['user-demarcation', 'sub-channels'],
    queryFn: getAllSubChannel,
  })
  const rangesQuery = useQuery({
    queryKey: ['user-demarcation', 'ranges'],
    queryFn: getAllRange,
  })

  const subChannels = subChannelsQuery.data?.payload ?? []
  const ranges = rangesQuery.data?.payload ?? []

  const defaultSubChannelId = useMemo(() => {
    const target = normalizeMatch(DEFAULT_SUB_CHANNEL_LABEL)
    const match = subChannels.find(
      (item) => normalizeMatch(item.subChannelName ?? '') === target
    )
    return normalizeId(match?.id)
  }, [subChannels])

  const defaultRangeId = useMemo(() => {
    const target = normalizeLabel(DEFAULT_RANGE_LABEL)
    const targetRange = normalizeLabel(`range ${DEFAULT_RANGE_LABEL}`)
    const match = ranges.find((item) => {
      const name = normalizeLabel(item.rangeName ?? '')
      return name === target || name === targetRange || name.startsWith(target)
    })
    return normalizeId(match?.id ?? match?.rangeId)
  }, [ranges])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setStorageChecked(true)
      return
    }
    let hasStoredFilters = false
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as HomeReportParams
        if (
          parsed?.subChannelId &&
          parsed?.rangeId &&
          parsed?.month &&
          parsed?.year
        ) {
          hasStoredFilters = true
          setParams((prev) => ({
            ...prev,
            subChannelId: parsed.subChannelId,
            rangeId: parsed.rangeId,
            areaId: parsed.areaId ?? prev.areaId ?? 0,
            month: parsed.month,
            year: parsed.year,
          }))
        }
      }
    } catch {
      /* noop */
    }
    setStorageChecked(true)
    if (hasStoredFilters) {
      setDefaultsApplied(true)
    }
  }, [])

  useEffect(() => {
    if (!storageChecked || defaultsApplied) return
    if (!subChannels.length || !ranges.length) return
    const fallbackSubChannelId = normalizeId(user?.subChannelId)
    const fallbackRangeId = normalizeId(user?.rangeId)
    const nextSubChannelId =
      params.subChannelId ?? defaultSubChannelId ?? fallbackSubChannelId
    const nextRangeId = params.rangeId ?? defaultRangeId ?? fallbackRangeId
    if (
      nextSubChannelId == null ||
      nextRangeId == null ||
      (nextSubChannelId === params.subChannelId &&
        nextRangeId === params.rangeId)
    ) {
      return
    }
    setParams((prev) => ({
      ...prev,
      subChannelId: nextSubChannelId,
      rangeId: nextRangeId,
    }))
    setDefaultsApplied(true)
  }, [
    user,
    storageChecked,
    defaultsApplied,
    subChannels.length,
    ranges.length,
    defaultSubChannelId,
    defaultRangeId,
    params.subChannelId,
    params.rangeId,
  ])

  const handleApply = (payload: FiltersPayload) => {
    const now = new Date()
    const nextParams: HomeReportParams = {
      subChannelId:
        payload.subChannelId ??
        defaultSubChannelId ??
        normalizeId(user?.subChannelId),
      rangeId:
        payload.rangeId ??
        defaultRangeId ??
        normalizeId(user?.rangeId),
      areaId: payload.areaId ?? 0,
      year: payload.year ?? now.getFullYear(),
      month: payload.month ?? now.getMonth() + 1,
    }

    setParams(nextParams)
    setDefaultsApplied(true)
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextParams))
    } catch {
      /* noop */
    }
  }

  const readyToFetch = Boolean(
    params.subChannelId && params.rangeId && params.month && params.year
  )

  const { data, isError, isFetching } = useQuery<HomeReportResponse>({
    queryKey: [
      'home-report',
      'top-management',
      params.subChannelId ?? null,
      params.rangeId ?? null,
      params.areaId ?? null,
      params.year ?? null,
      params.month ?? null,
    ],
    queryFn: async () => getHomeReportData(params as HomeReportParams),
    enabled: readyToFetch,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  const items = data?.payload ?? []
  const isLoading = readyToFetch && isFetching && !data
  const showSkeletons = !readyToFetch || isLoading

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalValue += item.totalValue ?? 0
        acc.totalCount += item.totalCount ?? 0
        acc.valueTarget += item.valueTarget ?? 0
        acc.pcTarget += item.pcTarget ?? 0
        return acc
      },
      {
        totalValue: 0,
        totalCount: 0,
        valueTarget: 0,
        pcTarget: 0,
      }
    )
  }, [items])

  const getMetricValue = (
    item: HomeReportItem,
    key: keyof HomeReportItem
  ) => {
    const raw = item[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const dailyData = useMemo(() => {
    if (!items.length || !params.month || !params.year) return []
    const daysInMonth = new Date(params.year, params.month, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const dayKey = `day${String(day).padStart(2, '0')}` as const
      const countKey = `${dayKey}Count` as keyof HomeReportItem
      const valueKey = `${dayKey}Value` as keyof HomeReportItem
      const totals = items.reduce(
        (acc, item) => {
          acc.pcCount += getMetricValue(item, countKey)
          acc.totalValue += getMetricValue(item, valueKey)
          return acc
        },
        { pcCount: 0, totalValue: 0 }
      )
      return {
        day,
        pcCount: totals.pcCount,
        totalValue: totals.totalValue,
      }
    })
  }, [items, params.month, params.year])

  const formatNumber = (value: number) =>
    Math.round(value).toLocaleString('en-LK')
  const formatPercent = (value: number, target: number) =>
    target > 0 ? `${Math.round((value / target) * 100)}%` : 'N/A'
  const formatSigned = (value: number) => {
    if (!Number.isFinite(value)) return '--'
    const sign = value > 0 ? '+' : ''
    return `${sign}${formatNumber(value)}`
  }
  const formatMonthYear = (month?: number, year?: number) => {
    if (!month || !year) return 'Current period'
    const date = new Date(Date.UTC(year, month - 1, 1))
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(date)
  }
  const formatAxisTick = (value: number) => {
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`
    return `${Math.round(value)}`
  }

  const periodLabel = formatMonthYear(params.month, params.year)
  const selectedSubChannelName =
    subChannels.find(
      (item) => normalizeId(item.id) === normalizeId(params.subChannelId)
    )?.subChannelName ?? items[0]?.subChannelName
  const selectedRangeName = ranges.find(
    (item) => normalizeId(item.id ?? item.rangeId) === params.rangeId
  )?.rangeName
  const subChannelLabel =
    selectedSubChannelName ??
    (params.subChannelId ? `Sub-channel ${params.subChannelId}` : 'Sub-channel')
  const rangeLabel = (() => {
    if (selectedRangeName) {
      const normalized = normalizeLabel(selectedRangeName)
      const prefix = normalizeLabel('range')
      return normalized.startsWith(prefix)
        ? selectedRangeName
        : `Range ${selectedRangeName}`
    }
    return params.rangeId ? `Range ${params.rangeId}` : 'Range'
  })()
  const valueVariance = totals.totalValue - totals.valueTarget

  const metricCards = [
    {
      title: 'Total Value',
      value: isError ? '--' : formatNumber(totals.totalValue),
      caption: isError
        ? 'Unable to load value'
        : `Target ${formatNumber(totals.valueTarget)}`,
      icon: <CircleDollarSign className='size-4' />,
      accent:
        'border-[var(--chart-1)]/30 bg-[var(--chart-1)]/10 dark:border-[var(--chart-1)]/55 dark:bg-[var(--chart-1)]/25',
      iconAccent:
        'bg-[var(--chart-1)]/20 text-[var(--chart-1)] dark:bg-[var(--chart-1)]/40',
    },
    {
      title: 'Total PC Count',
      value: isError ? '--' : formatNumber(totals.totalCount),
      caption: isError
        ? 'Unable to load count'
        : `Target ${formatNumber(totals.pcTarget)}`,
      icon: <BarChart3 className='size-4' />,
      accent:
        'border-[var(--chart-2)]/30 bg-[var(--chart-2)]/10 dark:border-[var(--chart-2)]/55 dark:bg-[var(--chart-2)]/25',
      iconAccent:
        'bg-[var(--chart-2)]/20 text-[var(--chart-2)] dark:bg-[var(--chart-2)]/40',
    },
    {
      title: 'Sale Percentage',
      value: isError
        ? '--'
        : formatPercent(totals.totalValue, totals.valueTarget),
      caption: isError
        ? 'Unable to load target'
        : `Variance ${formatSigned(valueVariance)}`,
      icon: <TrendingUp className='size-4' />,
      accent:
        'border-[var(--chart-3)]/30 bg-[var(--chart-3)]/10 dark:border-[var(--chart-3)]/55 dark:bg-[var(--chart-3)]/25',
      iconAccent:
        'bg-[var(--chart-3)]/20 text-[var(--chart-3)] dark:bg-[var(--chart-3)]/40',
    },
  ]

  return (
    <div className='space-y-6'>
      <Card className='p-4 shadow-sm dark:bg-gray-950'>
        <Filters onApply={handleApply} initialValues={params} />
      </Card>
      {!readyToFetch && (
        <CommonAlert
          variant='info'
          title='Apply filters to load Top Management data'
          description='Select sub-channel, range, month, and year, then Apply to load the report.'
        />
      )}
      {isError && (
        <CommonAlert
          variant='error'
          title='Unable to load Top Management data'
          description='Please try again or refresh the report filters.'
        />
      )}

      <Card>
        <CardHeader className='space-y-2'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle className='text-lg'>Top Management Overview</CardTitle>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary' className='uppercase tracking-wide'>
                {periodLabel}
              </Badge>
              {params.rangeId ? (
                <Badge variant='outline'>{rangeLabel}</Badge>
              ) : null}
            </div>
          </div>
          <CardDescription className='flex flex-wrap items-center gap-2'>
            <span>{subChannelLabel}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {metricCards.map((metric) => (
              <Card
                key={metric.title}
                className={cn('h-full border', metric.accent)}
              >
                <CardContent className='flex h-full flex-col justify-between p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      {metric.title}
                    </div>
                    <div
                      className={cn(
                        'flex size-9 items-center justify-center rounded-md',
                        metric.iconAccent
                      )}
                    >
                      {metric.icon}
                    </div>
                  </div>
                  <div className='mt-3 text-2xl font-semibold'>
                    {showSkeletons ? (
                      <Skeleton className='h-7 w-28' />
                    ) : (
                      metric.value
                    )}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {showSkeletons ? (
                      <Skeleton className='h-3 w-28' />
                    ) : (
                      metric.caption
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Daily Performance</CardTitle>
          <CardDescription>
            Territory totals per day for {periodLabel} (PC count and value).
          </CardDescription>
        </CardHeader>
        <CardContent className='ps-2'>
          {showSkeletons ? (
            <Skeleton className='h-[320px] w-full' />
          ) : dailyData.length ? (
            <ResponsiveContainer width='100%' height={320}>
              <BarChart data={dailyData} barGap={8}>
                <XAxis
                  dataKey='day'
                  stroke='#888888'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => String(value).padStart(2, '0')}
                />
                <YAxis
                  yAxisId='value'
                  stroke='#888888'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatAxisTick}
                />
                <YAxis
                  yAxisId='count'
                  orientation='right'
                  stroke='#888888'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => String(Math.round(value))}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatNumber(Number(value)),
                    String(name),
                  ]}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend
                  formatter={(value) => String(value)}
                />
                <Bar
                  dataKey='totalValue'
                  yAxisId='value'
                  name='Value'
                  fill='var(--chart-1)'
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey='pcCount'
                  yAxisId='count'
                  name='PC Count'
                  fill='var(--chart-2)'
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className='text-muted-foreground py-8 text-center text-sm'>
              No trend data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
