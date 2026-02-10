import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getAllChannel, getAllOutlets } from '@/services/userDemarcationApi'
import { getItemSummery } from '@/services/reports/otherReportsApi'
import TerritoryWiseItemsFilter, {
  type TerritoryWiseItemsFilters,
} from '@/components/reports/item-reports/Filter'
import type { OutletRecord } from '@/types/outlet'
import { cn } from '@/lib/utils'
import { normalizeBool } from '@/components/outlet-module/outlet-list-utils'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPrice } from '@/lib/format-price'
import type { ReportInvoiceTypeParam } from '@/types/invoice'

type ChannelStats = {
  total: number
  active: number
  inactive: number
}

const ITEM_SUMMARY_FILTER_STORAGE_KEY = 'senior-manager-item-summary-filters'

const readStoredItemSummaryFilters = (): TerritoryWiseItemsFilters | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ITEM_SUMMARY_FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TerritoryWiseItemsFilters
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildDefaultItemSummaryFilters = (): TerritoryWiseItemsFilters => {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 29)
  return {
    subChannelId: 3,
    areaId: 0,
    territoryId: 0,
    routeId: 0,
    outletId: 0,
    invoiceType: 'ALL',
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(today),
  }
}

const writeStoredItemSummaryFilters = (
  filters: TerritoryWiseItemsFilters | null
) => {
  if (typeof window === 'undefined') return
  if (!filters) {
    window.localStorage.removeItem(ITEM_SUMMARY_FILTER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(
    ITEM_SUMMARY_FILTER_STORAGE_KEY,
    JSON.stringify(filters)
  )
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')
const isTotalSoldValueKey = (key: string) =>
  normalizeKey(key) === 'totalsoldvalue'
const isTotalBookingValueKey = (key: string) =>
  normalizeKey(key) === 'totalbookingvalue'
const isItemIdKey = (key: string) => normalizeKey(key) === 'itemid'
const isItemNameKey = (key: string) =>
  [
    'itemname',
    'item',
    'productname',
    'product',
    'itemdescription',
    'description',
    'itemdesc',
  ].includes(normalizeKey(key))

const parseNumberValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const formatCompactNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}B`
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return `${Math.round(value)}`
}

const resolveOutletActive = (outlet: OutletRecord) => {
  if (typeof outlet.isClose === 'boolean') return !outlet.isClose
  const rawStatus = (outlet as OutletRecord & { isActive?: unknown }).isActive ??
    (outlet as OutletRecord & { active?: unknown }).active ??
    (outlet as OutletRecord & { enabled?: unknown }).enabled ??
    outlet.status
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }
  if (typeof rawStatus === 'boolean') return rawStatus
  return normalizeBool(rawStatus)
}

const resolveChannelActive = (channel: Record<string, unknown>) => {
  const rawStatus =
    (channel as { status?: unknown }).status ??
    (channel as { isActive?: unknown }).isActive ??
    (channel as { active?: unknown }).active ??
    (channel as { enabled?: unknown }).enabled
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }
  if (typeof rawStatus === 'boolean') return rawStatus
  return normalizeBool(rawStatus)
}

export function SeniorManagerSalesOverview() {
  const outletsQuery = useQuery({
    queryKey: ['user-demarcation', 'outlets'],
    queryFn: getAllOutlets,
  })
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: getAllChannel,
  })
  const [itemFilters, setItemFilters] =
    useState<TerritoryWiseItemsFilters | null>(() => {
      const stored = readStoredItemSummaryFilters()
      return stored ?? buildDefaultItemSummaryFilters()
    })
  const todayIso = useMemo(() => formatLocalDate(new Date()), [])
  const itemQueryParams = useMemo(() => {
    if (!itemFilters?.subChannelId) return null
    const invoiceTypeParam: ReportInvoiceTypeParam =
      itemFilters.invoiceType && itemFilters.invoiceType !== 'ALL'
        ? (itemFilters.invoiceType as ReportInvoiceTypeParam)
        : ''
    return {
      subChannelId: itemFilters.subChannelId,
      areaId: itemFilters.areaId ?? 0,
      territoryId: itemFilters.territoryId ?? 0,
      routeId: itemFilters.routeId ?? 0,
      outletId: itemFilters.outletId ?? 0,
      invoiceType: invoiceTypeParam,
      startDate: itemFilters.startDate ?? todayIso,
      endDate: itemFilters.endDate ?? todayIso,
    }
  }, [itemFilters, todayIso])
  const canFetchItemSummary = Boolean(itemQueryParams)
  const {
    data: itemSummaryData,
    isLoading: isItemSummaryLoading,
    isError: isItemSummaryError,
    error: itemSummaryError,
  } = useQuery({
    queryKey: ['reports', 'item-summary', 'senior-manager', itemQueryParams],
    enabled: canFetchItemSummary,
    queryFn: () => getItemSummery(itemQueryParams!),
  })

  const outlets = (outletsQuery.data?.payload ?? []) as OutletRecord[]
  const channels = channelsQuery.data?.payload ?? []
  const itemRows = useMemo(() => {
    const payload = (itemSummaryData as { payload?: unknown })?.payload
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
  }, [itemSummaryData])
  const itemColumnKeys = useMemo(
    () => (itemRows.length ? Object.keys(itemRows[0]) : []),
    [itemRows]
  )
  const itemChartKeys = useMemo(
    () => ({
      itemName: itemColumnKeys.find(isItemNameKey),
      itemId: itemColumnKeys.find(isItemIdKey),
      totalSoldValue: itemColumnKeys.find(isTotalSoldValueKey),
      totalBookingValue: itemColumnKeys.find(isTotalBookingValueKey),
    }),
    [itemColumnKeys]
  )

  const channelSummary = useMemo(() => {
    const activeChannels: typeof channels = []
    const inactiveChannelIds = new Set<string>()
    const inactiveChannelNames = new Set<string>()

    channels.forEach((channel) => {
      const key =
        channel.id === null || channel.id === undefined
          ? undefined
          : String(channel.id)
      const name =
        channel.channelName?.trim() || channel.channelCode?.trim() || key
      if (resolveChannelActive(channel as Record<string, unknown>)) {
        activeChannels.push(channel)
        return
      }
      if (key) inactiveChannelIds.add(key)
      if (name) inactiveChannelNames.add(name)
    })

    const statsById = new Map<string, ChannelStats>()
    const statsByName = new Map<string, ChannelStats>()
    const unknownStats: ChannelStats = { total: 0, active: 0, inactive: 0 }

    const addStats = (
      map: Map<string, ChannelStats>,
      key: string,
      isActive: boolean
    ) => {
      const existing = map.get(key) ?? { total: 0, active: 0, inactive: 0 }
      existing.total += 1
      if (isActive) {
        existing.active += 1
      } else {
        existing.inactive += 1
      }
      map.set(key, existing)
    }

    outlets.forEach((outlet) => {
      const isActive = resolveOutletActive(outlet)
      const rawId = (outlet as OutletRecord & { channelId?: unknown }).channelId
      const channelId =
        rawId === null || rawId === undefined ? undefined : Number(rawId)
      const channelKey = Number.isFinite(channelId)
        ? String(channelId)
        : undefined
      const nameFromOutlet = outlet.channelName?.trim()
      if (channelKey) {
        if (inactiveChannelIds.has(channelKey)) return
        addStats(statsById, channelKey, isActive)
        return
      }
      if (nameFromOutlet) {
        if (inactiveChannelNames.has(nameFromOutlet)) return
        addStats(statsByName, nameFromOutlet, isActive)
        return
      }
      unknownStats.total += 1
      if (isActive) {
        unknownStats.active += 1
      } else {
        unknownStats.inactive += 1
      }
    })

    const knownNames = new Set<string>()
    const items = activeChannels.map((channel) => {
      const key = String(channel.id)
      const name =
        channel.channelName?.trim() || channel.channelCode?.trim() || key
      knownNames.add(name)
      const stats =
        statsById.get(key) ??
        statsByName.get(name) ?? { total: 0, active: 0, inactive: 0 }
      return { key, name, count: stats.total, active: stats.active, inactive: stats.inactive }
    })

    statsByName.forEach((stats, name) => {
      if (knownNames.has(name) || inactiveChannelNames.has(name)) return
      items.push({
        key: `name-${name}`,
        name,
        count: stats.total,
        active: stats.active,
        inactive: stats.inactive,
      })
    })

    if (unknownStats.total > 0) {
      items.push({
        key: 'unknown',
        name: 'Unknown',
        count: unknownStats.total,
        active: unknownStats.active,
        inactive: unknownStats.inactive,
      })
    }

    return items
  }, [outlets, channels])

  const formatCount = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('en-LK') : '--'

  const cardTones = [
    {
      accent:
        'border-[var(--chart-1)]/35 bg-[var(--chart-1)]/8 dark:border-[var(--chart-1)]/55 dark:bg-[var(--chart-1)]/18',
      badge:
        'border-[var(--chart-1)]/40 bg-[var(--chart-1)]/15 text-foreground dark:bg-[var(--chart-1)]/30',
      stripe: 'bg-[var(--chart-1)]/60 dark:bg-[var(--chart-1)]/70',
    },
    {
      accent:
        'border-[var(--chart-2)]/35 bg-[var(--chart-2)]/8 dark:border-[var(--chart-2)]/55 dark:bg-[var(--chart-2)]/18',
      badge:
        'border-[var(--chart-2)]/40 bg-[var(--chart-2)]/15 text-foreground dark:bg-[var(--chart-2)]/30',
      stripe: 'bg-[var(--chart-2)]/60 dark:bg-[var(--chart-2)]/70',
    },
    {
      accent:
        'border-[var(--chart-3)]/35 bg-[var(--chart-3)]/8 dark:border-[var(--chart-3)]/55 dark:bg-[var(--chart-3)]/18',
      badge:
        'border-[var(--chart-3)]/40 bg-[var(--chart-3)]/15 text-foreground dark:bg-[var(--chart-3)]/30',
      stripe: 'bg-[var(--chart-3)]/60 dark:bg-[var(--chart-3)]/70',
    },
    {
      accent:
        'border-[var(--chart-4)]/35 bg-[var(--chart-4)]/8 dark:border-[var(--chart-4)]/55 dark:bg-[var(--chart-4)]/18',
      badge:
        'border-[var(--chart-4)]/40 bg-[var(--chart-4)]/15 text-foreground dark:bg-[var(--chart-4)]/30',
      stripe: 'bg-[var(--chart-4)]/60 dark:bg-[var(--chart-4)]/70',
    },
  ]

  const isLoading =
    outletsQuery.isLoading || channelsQuery.isLoading
  const isError = outletsQuery.isError || channelsQuery.isError
  const topItemChartData = useMemo(() => {
    if (!itemRows.length) return []
    const { itemName, itemId, totalSoldValue, totalBookingValue } =
      itemChartKeys
    if (!totalSoldValue && !totalBookingValue) return []

    const data = itemRows
      .map((row) => {
        const nameRaw =
          (itemName ? row[itemName] : undefined) ??
          (itemId ? row[itemId] : undefined)
        const label =
          nameRaw === null || nameRaw === undefined || nameRaw === ''
            ? 'Unknown'
            : String(nameRaw)
        const soldValue = totalSoldValue
          ? parseNumberValue(row[totalSoldValue]) ?? 0
          : 0
        const bookingValue = totalBookingValue
          ? parseNumberValue(row[totalBookingValue]) ?? 0
          : 0
        return {
          name: label,
          soldValue,
          bookingValue,
        }
      })
      .filter((item) => item.soldValue > 0 || item.bookingValue > 0)

    return data
      .sort((a, b) => b.soldValue - a.soldValue)
      .slice(0, 20)
  }, [itemRows, itemChartKeys])
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      setChartSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      )
    }

    updateSize()
    const raf = requestAnimationFrame(updateSize)
    let observer: ResizeObserver | null = null

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateSize())
      observer.observe(element)
    } else {
      window.addEventListener('resize', updateSize)
    }

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [topItemChartData.length])

  return (
    <div className='space-y-6'>
      {isError && (
        <CommonAlert
          variant='error'
          title='Unable to load outlet summary'
          description='Please try again or refresh the page.'
        />
      )}

      <Card>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-lg'>Outlets</CardTitle>
          <CardDescription>
            Channel-wise outlet count in a single-row executive strip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
              {Array.from({ length: 6 }).map((_, index) => (
                <Card
                  key={`channel-skeleton-${index}`}
                  className='relative h-full w-full overflow-hidden border'
                >
                  <CardContent className='flex h-full flex-col justify-between p-4'>
                    <div className='absolute inset-y-0 left-0 w-1.5 bg-muted/60' />
                    <div className='flex items-center justify-between gap-2 ps-2'>
                      <Skeleton className='h-3 w-16' />
                      <Skeleton className='h-4 w-8' />
                    </div>
                    <Skeleton className='mt-3 h-4 w-24 ps-2' />
                    <div className='mt-3 flex items-baseline gap-2 ps-2'>
                      <Skeleton className='h-7 w-16' />
                      <Skeleton className='h-3 w-12' />
                    </div>
                    <div className='mt-4 flex flex-wrap items-center gap-2 ps-2'>
                      <Skeleton className='h-5 w-20' />
                      <Skeleton className='h-5 w-24' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : channelSummary.length ? (
            <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
              {channelSummary.map((channel, index) => {
                const tone = cardTones[index % cardTones.length]
                return (
                  <Card
                    key={channel.key}
                    className={cn(
                      'relative h-full w-full overflow-hidden border shadow-sm',
                      tone.accent
                    )}
                  >
                    <CardContent className='flex h-full flex-col justify-between p-4'>
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 w-1.5',
                          tone.stripe
                        )}
                      />
                      <div className='flex items-center justify-between gap-2 ps-2'>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                          Channel
                        </p>
                        <Badge
                          variant='outline'
                          className={cn(
                            'border-transparent text-[10px] font-semibold uppercase tracking-wide',
                            tone.badge
                          )}
                        >
                          {index + 1}
                        </Badge>
                      </div>
                      <div className='mt-3 ps-2 text-sm font-semibold leading-tight text-foreground sm:text-base'>
                        <span className='block truncate'>{channel.name}</span>
                      </div>
                      <div className='mt-3 flex items-baseline gap-2 ps-2'>
                        <span className='text-2xl font-semibold text-foreground'>
                          {formatCount(channel.count)}
                        </span>
                        <span className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Outlets
                        </span>
                      </div>
                      <div className='mt-4 flex flex-wrap items-center gap-2 ps-2'>
                        <Badge
                          variant='outline'
                          className='border-[var(--chart-2)]/45 bg-[var(--chart-2)]/15 text-[10px] font-semibold uppercase tracking-wide text-foreground dark:bg-[var(--chart-2)]/30'
                        >
                          Active {formatCount(channel.active)}
                        </Badge>
                        <Badge
                          variant='outline'
                          className='border-[var(--chart-4)]/45 bg-[var(--chart-4)]/15 text-[10px] font-semibold uppercase tracking-wide text-foreground dark:bg-[var(--chart-4)]/30'
                        >
                          Inactive {formatCount(channel.inactive)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
              No outlet data available for channel summary.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-lg'>Top 20 Items by Value</CardTitle>
          <CardDescription>
            Compare total sold value vs total booking value for leading items.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='rounded-md border bg-muted/30 p-3'>
            <TerritoryWiseItemsFilter
              initialValues={itemFilters ?? undefined}
              onApply={(next) => {
                if (!next.subChannelId) {
                  writeStoredItemSummaryFilters(null)
                  setItemFilters(null)
                  return
                }
                writeStoredItemSummaryFilters(next)
                setItemFilters(next)
              }}
            />
          </div>
          {!canFetchItemSummary ? (
            <CommonAlert
              variant='info'
              title='Apply filters'
              description='Select filters to load the item value chart.'
            />
          ) : isItemSummaryError ? (
            <CommonAlert
              variant='error'
              title='Failed to load item summary'
              description={
                itemSummaryError instanceof Error
                  ? itemSummaryError.message
                  : 'Unknown error occurred'
              }
            />
          ) : isItemSummaryLoading ? (
            <div className='h-[420px] rounded-md border'>
              <div className='flex h-full items-center justify-center'>
                <Skeleton className='h-6 w-40' />
              </div>
            </div>
          ) : topItemChartData.length ? (
            <div
              ref={chartContainerRef}
              className='h-[420px] min-h-[360px] rounded-md border p-2'
            >
              {chartSize.width > 0 && chartSize.height > 0 ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={topItemChartData}
                    layout='vertical'
                    barGap={8}
                    margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
                  >
                    <XAxis
                      type='number'
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCompactNumber}
                      fontSize={11}
                    />
                    <YAxis
                      type='category'
                      dataKey='name'
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatPrice(Number(value)),
                        String(name),
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey='soldValue'
                      name='Total Sold Value'
                      fill='var(--chart-1)'
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    />
                    <Bar
                      dataKey='bookingValue'
                      name='Total Booking Value'
                      fill='var(--chart-2)'
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className='flex h-full items-center justify-center'>
                  <Skeleton className='h-6 w-40' />
                </div>
              )}
            </div>
          ) : (
            <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
              No item value data available for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


