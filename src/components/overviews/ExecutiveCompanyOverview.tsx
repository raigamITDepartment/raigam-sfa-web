import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  ClipboardList,
  PackageSearch,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommonAlert } from '@/components/common-alert'
import TerritoryWiseItemsFilter, {
  type TerritoryWiseItemsFilters,
} from '@/components/reports/item-reports/Filter'
import { getItemSummery } from '@/services/reports/otherReportsApi'
import { getAreaWiseSalesSummery } from '@/services/reports/invoiceReports'
import type { ReportInvoiceTypeParam } from '@/types/invoice'
import { formatPrice } from '@/lib/format-price'

export function ExecutiveCompanyOverview() {
  const storedFilters = useMemo(readStoredFilters, [])
  const [filters, setFilters] = useState<TerritoryWiseItemsFilters>(
    () => storedFilters ?? buildDefaultFilters()
  )

  const todayIso = useMemo(() => formatLocalDate(new Date()), [])
  const invoiceTypeParam = useMemo<ReportInvoiceTypeParam>(() => {
    if (!filters.invoiceType || filters.invoiceType === 'ALL') return ''
    return filters.invoiceType as ReportInvoiceTypeParam
  }, [filters.invoiceType])

  const itemQueryParams = useMemo(() => {
    if (!filters.subChannelId) return null
    return {
      subChannelId: filters.subChannelId,
      areaId: filters.areaId ?? 0,
      territoryId: filters.territoryId ?? 0,
      routeId: filters.routeId ?? 0,
      outletId: filters.outletId ?? 0,
      invoiceType: invoiceTypeParam,
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
    }
  }, [filters, invoiceTypeParam, todayIso])

  const invoiceQueryParams = useMemo(() => {
    if (!filters.areaId || Number(filters.areaId) === 0) return null
    return {
      areaId: filters.areaId,
      startDate: filters.startDate ?? todayIso,
      endDate: filters.endDate ?? todayIso,
      invoiceType: invoiceTypeParam,
    }
  }, [filters.areaId, filters.startDate, filters.endDate, invoiceTypeParam, todayIso])

  const {
    data: invoiceSummaryData,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useQuery({
    queryKey: ['overview', 'executive-company', 'invoice-summary', invoiceQueryParams],
    enabled: Boolean(invoiceQueryParams),
    queryFn: () => getAreaWiseSalesSummery(invoiceQueryParams!),
    staleTime: 1000 * 60 * 5,
  })

  const {
    data: itemSummaryData,
    isLoading: itemLoading,
    isError: itemError,
  } = useQuery({
    queryKey: ['overview', 'executive-company', 'item-summary', itemQueryParams],
    enabled: Boolean(itemQueryParams),
    queryFn: () => getItemSummery(itemQueryParams!),
    staleTime: 1000 * 60 * 5,
  })

  const invoiceRows = useMemo(() => {
    const payload = (invoiceSummaryData as { payload?: unknown })?.payload
    return Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : []
  }, [invoiceSummaryData])

  const invoiceColumnKeys = useMemo(
    () => (invoiceRows.length ? Object.keys(invoiceRows[0]) : []),
    [invoiceRows]
  )

  const invoiceKeyMap = useMemo(
    () => ({
      name: findColumnKey(invoiceColumnKeys, [
        'territoryname',
        'territory',
        'areaname',
        'area',
        'region',
      ]),
      value: findColumnKey(invoiceColumnKeys, [
        'totalactualvalue',
        'totalbookfinalvalue',
        'totalbookvalue',
        'totalinvoicevalue',
        'totalvalue',
        'totalamount',
        'amount',
        'netvalue',
      ]),
      count: findColumnKey(invoiceColumnKeys, [
        'invoicecount',
        'totalinvoicecount',
        'totalcount',
        'count',
        'qty',
        'quantity',
      ]),
    }),
    [invoiceColumnKeys]
  )

  const invoiceTotals = useMemo((): {
    totalValue: number
    totalCount: number
  } => {
    return invoiceRows.reduce<{ totalValue: number; totalCount: number }>(
      (acc, row) => {
        if (invoiceKeyMap.value) {
          const valueKey = invoiceKeyMap.value
          acc.totalValue += parseNumberValue(row[valueKey]) ?? 0
        }
        if (invoiceKeyMap.count) {
          const countKey = invoiceKeyMap.count
          acc.totalCount += parseNumberValue(row[countKey]) ?? 0
        } else {
          acc.totalCount += 1
        }
        return acc
      },
      { totalValue: 0, totalCount: 0 }
    )
  }, [invoiceRows, invoiceKeyMap])

  const invoiceChartData = useMemo(() => {
    const valueKey = invoiceKeyMap.value
    if (!invoiceRows.length || !valueKey) return []
    return invoiceRows
      .map((row) => {
        const labelRaw = invoiceKeyMap.name ? row[invoiceKeyMap.name] : undefined
        const label =
          labelRaw === null || labelRaw === undefined || labelRaw === ''
            ? 'Unknown'
            : String(labelRaw)
        const value = parseNumberValue(row[valueKey]) ?? 0
        return { name: label, value }
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [invoiceRows, invoiceKeyMap])

  const itemRows = useMemo(() => {
    const payload = (itemSummaryData as { payload?: unknown })?.payload
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
  }, [itemSummaryData])

  const itemColumnKeys = useMemo(
    () => (itemRows.length ? Object.keys(itemRows[0]) : []),
    [itemRows]
  )

  const itemKeyMap = useMemo(
    () => ({
      name: findColumnKey(itemColumnKeys, [
        'itemname',
        'item',
        'productname',
        'product',
        'itemdescription',
        'description',
        'itemdesc',
      ]),
      id: findColumnKey(itemColumnKeys, ['itemid']),
      soldValue: findColumnKey(itemColumnKeys, ['totalsoldvalue']),
      bookingValue: findColumnKey(itemColumnKeys, ['totalbookingvalue']),
      soldQty: findColumnKey(itemColumnKeys, ['soldqty', 'totalsoldqty']),
    }),
    [itemColumnKeys]
  )

  const itemTotals = useMemo((): {
    totalSoldValue: number
    totalBookingValue: number
    totalSoldQty: number
  } => {
    return itemRows.reduce<{
      totalSoldValue: number
      totalBookingValue: number
      totalSoldQty: number
    }>(
      (acc, row) => {
        if (itemKeyMap.soldValue) {
          const soldValueKey = itemKeyMap.soldValue
          acc.totalSoldValue += parseNumberValue(row[soldValueKey]) ?? 0
        }
        if (itemKeyMap.bookingValue) {
          const bookingValueKey = itemKeyMap.bookingValue
          acc.totalBookingValue +=
            parseNumberValue(row[bookingValueKey]) ?? 0
        }
        if (itemKeyMap.soldQty) {
          const soldQtyKey = itemKeyMap.soldQty
          acc.totalSoldQty += parseNumberValue(row[soldQtyKey]) ?? 0
        }
        return acc
      },
      { totalSoldValue: 0, totalBookingValue: 0, totalSoldQty: 0 }
    )
  }, [itemRows, itemKeyMap])

  const itemChartData = useMemo(() => {
    if (!itemRows.length) return []
    const valueKey = itemKeyMap.soldValue ?? itemKeyMap.bookingValue
    if (!valueKey) return []
    return itemRows
      .map((row) => {
        const labelRaw =
          (itemKeyMap.name ? row[itemKeyMap.name] : undefined) ??
          (itemKeyMap.id ? row[itemKeyMap.id] : undefined)
        const label =
          labelRaw === null || labelRaw === undefined || labelRaw === ''
            ? 'Unknown'
            : String(labelRaw)
        const value = parseNumberValue(row[valueKey]) ?? 0
        const qty = itemKeyMap.soldQty
          ? parseNumberValue(row[itemKeyMap.soldQty]) ?? 0
          : 0
        return { name: label, value, qty }
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [itemRows, itemKeyMap])

  const topInvoice = invoiceChartData[0]?.name ?? '--'
  const topItem = itemChartData[0]?.name ?? '--'
  const invoiceAvgValue =
    invoiceTotals.totalCount > 0
      ? invoiceTotals.totalValue / invoiceTotals.totalCount
      : 0

  const handleApplyFilters = (next: TerritoryWiseItemsFilters) => {
    setFilters(next)
    writeStoredFilters(next)
  }

  const dateRangeLabel = formatRangeLabel(filters)
  const invoiceTypeLabel =
    filters.invoiceType && filters.invoiceType !== 'ALL'
      ? `${filters.invoiceType} Invoices`
      : 'All Invoice Types'

  return (
    <div className='space-y-6'>
      <Card className='relative overflow-hidden border bg-gradient-to-br from-slate-100 via-white to-cyan-50 text-slate-900 shadow-sm'>
        <div className='pointer-events-none absolute -right-32 -top-24 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-amber-200/35 blur-3xl' />
        <CardHeader className='relative space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <Badge
              variant='outline'
              className='border-emerald-300/60 bg-emerald-200/50 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900'
            >
              Executive Company
            </Badge>
            <Badge
              variant='outline'
              className='border-slate-300/70 bg-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700'
            >
              Overview Console
            </Badge>
          </div>
          <div>
            <CardTitle className='text-2xl sm:text-3xl'>
              Revenue & Item Pulse
            </CardTitle>
            <CardDescription className='text-slate-600'>
              {dateRangeLabel} · {invoiceTypeLabel}
            </CardDescription>
          </div>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500'>
                Invoice Value
                <BarChart3 className='h-4 w-4 text-emerald-600' />
              </div>
              <div className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatPrice(invoiceTotals.totalValue)}
              </div>
              <p className='mt-2 text-xs text-slate-500'>
                Avg {formatPrice(invoiceAvgValue)}
              </p>
            </div>
            <div className='rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500'>
                Invoice Count
                <ClipboardList className='h-4 w-4 text-sky-600' />
              </div>
              <div className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatCount(invoiceTotals.totalCount)}
              </div>
              <p className='mt-2 text-xs text-slate-500'>
                Top territory: {topInvoice}
              </p>
            </div>
            <div className='rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500'>
                Sold Value
                <TrendingUp className='h-4 w-4 text-emerald-600' />
              </div>
              <div className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatPrice(itemTotals.totalSoldValue)}
              </div>
              <p className='mt-2 text-xs text-slate-500'>
                Booking {formatPrice(itemTotals.totalBookingValue)}
              </p>
            </div>
            <div className='rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm'>
              <div className='flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500'>
                Sold Qty
                <PackageSearch className='h-4 w-4 text-sky-600' />
              </div>
              <div className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatCount(itemTotals.totalSoldQty)}
              </div>
              <p className='mt-2 text-xs text-slate-500'>
                Top item: {topItem}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className='border shadow-sm'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-lg'>Reporting Lens</CardTitle>
          <CardDescription>
            Align invoice and item analytics to the same date window and channel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TerritoryWiseItemsFilter
            initialValues={filters}
            onApply={handleApplyFilters}
          />
        </CardContent>
      </Card>

      {(invoiceError || itemError) && (
        <CommonAlert
          variant='error'
          title='Unable to load overview data'
          description='Please adjust filters or refresh the page.'
        />
      )}

      <div className='grid gap-6 xl:grid-cols-2'>
        <Card className='border shadow-sm'>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-lg'>Invoice Summary</CardTitle>
              <CardDescription>
                Top territories by invoice value.
              </CardDescription>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link to='/reports/invoice-reports/territory-wise-invoice-summary'>
                Open Report
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!invoiceQueryParams && (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                Select an area to unlock invoice summary insights.
              </div>
            )}
            {invoiceQueryParams && invoiceLoading && (
              <div className='space-y-4'>
                <Skeleton className='h-6 w-40' />
                <Skeleton className='h-64 w-full' />
              </div>
            )}
            {invoiceQueryParams && !invoiceLoading && invoiceChartData.length === 0 && (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                No invoice summary data available for the selected filters.
              </div>
            )}
            {invoiceQueryParams && invoiceChartData.length > 0 && (
              <div className='space-y-5'>
                <div className='h-64 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={invoiceChartData} margin={{ left: 16, right: 16 }}>
                      <XAxis dataKey='name' tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} width={48} />
                      <Tooltip
                        formatter={(value) =>
                          formatPrice(Number(value ?? 0))
                        }
                      />
                      <Bar
                        dataKey='value'
                        fill='#0E7490'
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  {invoiceChartData.slice(0, 4).map((row) => (
                    <div
                      key={row.name}
                      className='flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2'
                    >
                      <span className='text-sm font-medium text-foreground'>
                        {row.name}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        {formatPrice(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border shadow-sm'>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-lg'>Item Performance</CardTitle>
              <CardDescription>
                Top items ranked by sales value.
              </CardDescription>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link to='/reports/item-reports/item-summary-report'>
                Open Report
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!itemQueryParams && (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                Select a sub-channel to unlock item performance.
              </div>
            )}
            {itemQueryParams && itemLoading && (
              <div className='space-y-4'>
                <Skeleton className='h-6 w-36' />
                <Skeleton className='h-64 w-full' />
              </div>
            )}
            {itemQueryParams && !itemLoading && itemChartData.length === 0 && (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                No item data available for the selected filters.
              </div>
            )}
            {itemQueryParams && itemChartData.length > 0 && (
              <div className='space-y-5'>
                <div className='h-64 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={itemChartData} margin={{ left: 16, right: 16 }}>
                      <XAxis dataKey='name' tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} width={48} />
                      <Tooltip
                        formatter={(value) =>
                          formatPrice(Number(value ?? 0))
                        }
                      />
                      <Bar
                        dataKey='value'
                        fill='#0F766E'
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  {itemChartData.slice(0, 4).map((row) => (
                    <div
                      key={row.name}
                      className='flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2'
                    >
                      <span className='text-sm font-medium text-foreground'>
                        {row.name}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        {formatPrice(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const FILTER_STORAGE_KEY = 'executive-company-overview-filters-v2'

const readStoredFilters = (): TerritoryWiseItemsFilters | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TerritoryWiseItemsFilters
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const writeStoredFilters = (filters: TerritoryWiseItemsFilters | null) => {
  if (typeof window === 'undefined') return
  if (!filters) {
    window.localStorage.removeItem(FILTER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildDefaultFilters = (): TerritoryWiseItemsFilters => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    subChannelId: 3,
    areaId: 21,
    territoryId: 0,
    routeId: 0,
    outletId: 0,
    invoiceType: 'ALL',
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(today),
  }
}

const formatRangeLabel = (filters: TerritoryWiseItemsFilters) => {
  const from = filters.startDate
  const to = filters.endDate
  if (!from && !to) return 'Select date range'
  if (from && to) return `${from} ~ ${to}`
  return from ?? to ?? 'Select date range'
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const findColumnKey = (keys: string[], candidates: string[]) =>
  keys.find((key) => candidates.includes(normalizeKey(key)))

const parseNumberValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const formatCount = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString('en-LK') : '--'
