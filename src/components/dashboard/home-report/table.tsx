import { useEffect, useMemo, useState } from 'react'
import type { HomeReportItem } from '@/types/home-report'
import {
  ChevronLeft,
  ChevronRight,
  Maximize as Fullscreen,
  Minimize,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HomeReportExport from './export-excel'
import type {
  HomeReportTableProps,
  PastMonthColumnDef,
  PastMonthMeta,
  RowRecord,
} from './types'

const PAST_MONTH_COLUMN_DEFS: PastMonthColumnDef[] = [
  {
    index: 1,
    defaultLabel: 'Past 1 Month',
    valueKey: 'past1MonthTotalValue',
    pcKey: 'past1MonthTotalPcCount',
    nameKey: 'past1MonthName',
    numberKey: 'past1MonthNumber',
  },
  {
    index: 2,
    defaultLabel: 'Past 2 Month',
    valueKey: 'past2MonthTotalValue',
    pcKey: 'past2MonthTotalPcCount',
    nameKey: 'past2MonthName',
    numberKey: 'past2MonthNumber',
  },
  {
    index: 3,
    defaultLabel: 'Past 3 Month',
    valueKey: 'past3MonthTotalValue',
    pcKey: 'past3MonthTotalPcCount',
    nameKey: 'past3MonthName',
    numberKey: 'past3MonthNumber',
  },
  {
    index: 4,
    defaultLabel: 'Past 4 Month',
    valueKey: 'past4MonthTotalValue',
    pcKey: 'past4MonthTotalPcCount',
    nameKey: 'past4MonthName',
    numberKey: 'past4MonthNumber',
  },
  {
    index: 5,
    defaultLabel: 'Past 5 Month',
    valueKey: 'past5MonthTotalValue',
    pcKey: 'past5MonthTotalPcCount',
    nameKey: 'past5MonthName',
    numberKey: 'past5MonthNumber',
  },
  {
    index: 6,
    defaultLabel: 'Past 6 Month',
    valueKey: 'past6MonthTotalValue',
    pcKey: 'past6MonthTotalPcCount',
    nameKey: 'past6MonthName',
    numberKey: 'past6MonthNumber',
  },
  {
    index: 7,
    defaultLabel: 'Past 7 Month',
    valueKey: 'past7MonthTotalValue',
    pcKey: 'past7MonthTotalPcCount',
    nameKey: 'past7MonthName',
    numberKey: 'past7MonthNumber',
  },
  {
    index: 8,
    defaultLabel: 'Past 8 Month',
    valueKey: 'past8MonthTotalValue',
    pcKey: 'past8MonthTotalPcCount',
    nameKey: 'past8MonthName',
    numberKey: 'past8MonthNumber',
  },
  {
    index: 9,
    defaultLabel: 'Past 9 Month',
    valueKey: 'past9MonthTotalValue',
    pcKey: 'past9MonthTotalPcCount',
    nameKey: 'past9MonthName',
    numberKey: 'past9MonthNumber',
  },
  {
    index: 10,
    defaultLabel: 'Past 10 Month',
    valueKey: 'past10MonthTotalValue',
    pcKey: 'past10MonthTotalPcCount',
    nameKey: 'past10MonthName',
    numberKey: 'past10MonthNumber',
  },
  {
    index: 11,
    defaultLabel: 'Past 11 Month',
    valueKey: 'past11MonthTotalValue',
    pcKey: 'past11MonthTotalPcCount',
    nameKey: 'past11MonthName',
    numberKey: 'past11MonthNumber',
  },
  {
    index: 12,
    defaultLabel: 'Past 12 Month',
    valueKey: 'past12MonthTotalValue',
    pcKey: 'past12MonthTotalPcCount',
    nameKey: 'past12MonthName',
    numberKey: 'past12MonthNumber',
  },
]

// Color palette for daily columns (1–31)
const dayColors = [
  'bg-blue-50',
  'bg-green-50',
  'bg-yellow-50',
  'bg-red-50',
  'bg-purple-50',
  'bg-pink-50',
  'bg-indigo-50',
  'bg-teal-50',
  'bg-cyan-50',
  'bg-amber-50',
  'bg-lime-50',
  'bg-emerald-50',
  'bg-sky-50',
  'bg-violet-50',
  'bg-fuchsia-50',
  'bg-rose-50',
  'bg-orange-50',
  'bg-gray-50',
  'bg-blue-100',
  'bg-green-100',
  'bg-yellow-100',
  'bg-red-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-teal-100',
  'bg-cyan-100',
  'bg-amber-100',
  'bg-lime-100',
  'bg-emerald-100',
  'bg-sky-100',
]

const BASE_METRIC_HEADERS = [
  'Target',
  'Total-Value',
  'Variance - Cum Target vs',
  'Sale (%)',
  'PC-Target',
  'Total-PC',
  'Avg PC',
  'Given WD',
  'WD',
  'WD Variance',
  'Avg (With Direct)',
] as const

const LABEL_COLUMN_KEYS = ['Region Name', 'Area', 'Territory'] as const
const LABEL_COLUMN_SET = new Set<string>(LABEL_COLUMN_KEYS)

const parseNum = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0
  const s = String(v).replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

const formatPastMonthCurrency = (value: number): string => {
  return Math.round(value).toLocaleString('en-LK')
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const LONG_MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const PAST_MONTH_COLUMN_COLORS = [
  'bg-amber-50 dark:bg-amber-950/40',
  'bg-blue-50 dark:bg-blue-950/40',
  'bg-emerald-50 dark:bg-emerald-950/40',
  'bg-rose-50 dark:bg-rose-950/40',
  'bg-slate-50 dark:bg-slate-900/40',
  'bg-orange-50 dark:bg-orange-950/40',
]

const parseMonthIndexFromString = (input?: string) => {
  if (!input) return undefined
  const normalized = input.toLowerCase()
  const longIndex = LONG_MONTH_NAMES.findIndex((m) => normalized.includes(m))
  if (longIndex >= 0) return longIndex
  const shortIndex = SHORT_MONTH_NAMES.findIndex((m) =>
    normalized.includes(m.toLowerCase())
  )
  if (shortIndex >= 0) return shortIndex
  const parsed = Date.parse(`${normalized} 1, 2000`)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).getUTCMonth()
  }
  return undefined
}

const getFallbackPastMonthLabels = (baseMonthIndex?: number) => {
  const base =
    typeof baseMonthIndex === 'number' && baseMonthIndex >= 0
      ? baseMonthIndex
      : new Date().getMonth()
  const labels: string[] = []
  for (let i = 1; i <= 12; i++) {
    const monthIdx = (base - i + 12) % 12
    labels.push(SHORT_MONTH_NAMES[monthIdx])
  }
  return labels
}

const resolveShortMonthName = (
  rawName: string | undefined,
  monthNumber: number | undefined
) => {
  if (typeof rawName === 'string' && rawName.trim()) {
    const normalized = rawName.trim().toLowerCase()
    const matchIndex = SHORT_MONTH_NAMES.findIndex(
      (short, idx) =>
        short.toLowerCase() === normalized ||
        normalized === LONG_MONTH_NAMES[idx]
    )
    if (matchIndex >= 0) return SHORT_MONTH_NAMES[matchIndex]
    const parsed = Date.parse(`${normalized} 1, 2000`)
    if (!Number.isNaN(parsed)) {
      return SHORT_MONTH_NAMES[new Date(parsed).getUTCMonth()]
    }
  }
  if (monthNumber && monthNumber >= 1 && monthNumber <= 12) {
    return SHORT_MONTH_NAMES[monthNumber - 1]
  }
  return undefined
}

const resolvePastMonthLabel = (
  rawName: string | undefined,
  monthNumber: number | undefined,
  fallback: string
) => {
  return resolveShortMonthName(rawName, monthNumber) ?? fallback
}

// Collect days (01-31) that contain any value or count to avoid empty day columns.
const collectDaysWithData = (items: HomeReportItem[]) => {
  if (!items?.length) return [] as string[]
  const days: string[] = []
  for (let i = 1; i <= 31; i++) {
    const day = i.toString().padStart(2, '0')
    const has = items.some(
      (it) =>
        (it as any)[`day${day}Value`] > 0 || (it as any)[`day${day}Count`] > 0
    )
    if (has) days.push(day)
  }
  return days
}

const buildPastMonthMeta = (
  firstItem: HomeReportItem | undefined,
  fallbackPastMonthLabels: string[]
): PastMonthMeta[] =>
  // Build labels/headers for past months using provided names or short-name fallbacks.
  PAST_MONTH_COLUMN_DEFS.map((column) => {
    const rawName = firstItem?.[column.nameKey]
    const monthNumber = firstItem?.[column.numberKey]
    const fallbackLabel =
      fallbackPastMonthLabels[column.index - 1] || column.defaultLabel
    const label = resolvePastMonthLabel(rawName, monthNumber, fallbackLabel)
    return {
      ...column,
      label,
      valueHeader: `${label} Value`,
      pcHeader: `${label} PC`,
    }
  })

const buildHeaders = (
  daysWithData: string[],
  pastMonthMeta: PastMonthMeta[]
) => {
  // Compose table headers: identifiers, dynamic day columns, base metrics, and past-month headers.
  const headers: string[] = [...LABEL_COLUMN_KEYS]
  daysWithData.forEach((day) => {
    headers.push(`${day} Value`, `${day} PC`)
  })
  headers.push(...BASE_METRIC_HEADERS)
  headers.push(
    ...pastMonthMeta.flatMap((meta) => [meta.valueHeader, meta.pcHeader])
  )
  return headers
}

const createRowFromItem = (
  item: HomeReportItem,
  daysWithData: string[],
  pastMonthMeta: PastMonthMeta[]
): RowRecord => {
  // Normalize a single API item into a formatted table row.
  const row: RowRecord = {
    'Region Name': item.regionName,
    Area: item.areaDisplayOrder
      ? `${item.areaDisplayOrder}. ${item.areaName}`
      : item.areaName,
    Territory: item.territoryName,
    Target: '0',
    'Total-Value': '0',
    'Variance - Cum Target vs': '0',
    'Sale (%)': '0%',
    'PC-Target': '0',
    'Total-PC': '0',
    'Avg PC': '0',
    'Given WD': '0',
    WD: '0',
    'WD Variance': '0',
    'Avg (With Direct)': '0',
  }

  daysWithData.forEach((day) => {
    const v = Math.round((item as any)[`day${day}Value`] || 0).toLocaleString(
      'en-LK'
    )
    const c = (item as any)[`day${day}Count`] || 0
    row[`${day} Value`] = v
    row[`${day} PC`] = c
  })

  const givenWD = item.givenWorkingDays ?? 0
  const wd = Math.round(item.workingDays || 0)
  const totalValue = Math.round(item.totalValue || 0)
  const targetValue = Math.round(item.valueTarget || 0)
  const variance = targetValue - totalValue

  Object.assign(row, {
    Target: targetValue.toLocaleString('en-LK'),
    'Total-Value': totalValue.toLocaleString('en-LK'),
    'Variance - Cum Target vs': variance.toLocaleString('en-LK'),
    'Sale (%)':
      targetValue > 0
        ? `${Math.round((totalValue / targetValue) * 100)}%`
        : '0%',
    'PC-Target': item.pcTarget || 0,
    'Total-PC': item.totalCount || 0,
    'Given WD': givenWD,
    WD: wd,
    'WD Variance': givenWD - wd,
    'Avg PC': wd > 0 ? Math.round((item.totalCount || 0) / wd) : 0,
    'Avg (With Direct)': '0',
  })

  pastMonthMeta.forEach((meta) => {
    const value = Number(item[meta.valueKey] ?? 0)
    const pcCount = Math.round(item[meta.pcKey] ?? 0)
    row[meta.valueHeader] = formatPastMonthCurrency(value)
    row[meta.pcHeader] = pcCount.toLocaleString('en-LK')
  })

  return row
}

const buildTableData = (
  items: HomeReportItem[],
  fallbackPastMonthLabels: string[]
) => {
  // Build headers and rows once per items/period change to keep rendering lean.
  if (!items || items.length === 0)
    return { headers: [] as string[], data: [] as RowRecord[] }

  const daysWithData = collectDaysWithData(items)
  const pastMonthMeta = buildPastMonthMeta(items[0], fallbackPastMonthLabels)
  const headers = buildHeaders(daysWithData, pastMonthMeta)
  const data = items.map((item) =>
    createRowFromItem(item, daysWithData, pastMonthMeta)
  )
  return { headers, data }
}

const isPercentHeader = (h: string) => h.includes('%')
const isAverageHeader = (h: string) => /avg/i.test(h)
const isPCHeader = (h: string) => /PC$/.test(h)

const aggregateRows = (rows: RowRecord[], headers: string[]): RowRecord => {
  // Aggregate numeric fields for totals/averages while skipping label columns.
  const out: RowRecord = {
    'Region Name': '',
    Area: '',
    Territory: '',
    Target: '0',
    'Total-Value': '0',
    'Variance - Cum Target vs': '0',
    'Sale (%)': '0%',
    'PC-Target': '0',
    'Total-PC': '0',
    'Avg PC': '0',
    'Given WD': '0',
    WD: '0',
    'WD Variance': '0',
    'Avg (With Direct)': '0',
  }

  for (const h of headers) {
    if (LABEL_COLUMN_SET.has(h)) continue
    const values = rows
      .map((r) => parseNum(r[h]))
      .filter(Number.isFinite) as number[]
    if (values.length === 0) continue
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    let result: string | number
    if (isPercentHeader(h)) {
      result = `${Math.round(avg)}%`
    } else if (isAverageHeader(h)) {
      result = Math.round(avg)
    } else if (isPCHeader(h)) {
      result = Math.round(sum)
    } else {
      result = Math.round(sum).toLocaleString('en-LK')
    }
    out[h] = result.toString()
  }

  // Derive Sale (%) if possible
  const t = parseNum(out['Target'])
  const totalKey = Object.keys(out).find((k) => k.endsWith('-Value'))
  const totalVal = totalKey ? parseNum(out[totalKey]) : 0
  if (t > 0 && totalVal >= 0) {
    out['Sale (%)'] = `${Math.round((totalVal / t) * 100)}%`
  }
  return out
}

const getRowSpan = (
  rows: RowRecord[],
  key: keyof RowRecord,
  startIdx: number
) => {
  // Return row-span length for merged Region/Area cells; 0 means continue previous span.
  const value = rows[startIdx][key]
  if (startIdx > 0 && rows[startIdx - 1][key] === value) return 0
  let span = 1
  for (let i = startIdx + 1; i < rows.length; i++) {
    if (rows[i][key] === value) span++
    else break
  }
  return span
}

// Render the table markup with sticky headers and row spans.
function renderTable(
  headers: string[],
  currentMonthHeaders: string[],
  pastMonthsHeaders: string[],
  monthKey: string,
  paginated: RowRecord[],
  isFullScreen: boolean
) {
  const pastMonthColumnSet = new Set(pastMonthsHeaders)
  const pastMonthKeyOrder: string[] = []
  pastMonthsHeaders.forEach((header) => {
    const key = header.replace(/ (Value|PC)$/, '')
    if (!pastMonthKeyOrder.includes(key)) pastMonthKeyOrder.push(key)
  })
  const pastMonthColorMap = new Map<string, string>()
  pastMonthKeyOrder.forEach((key, index) => {
    pastMonthColorMap.set(
      key,
      PAST_MONTH_COLUMN_COLORS[index % PAST_MONTH_COLUMN_COLORS.length]
    )
  })
  const resolvePastMonthClass = (header: string) => {
    if (!pastMonthColumnSet.has(header)) return ''
    const key = header.replace(/ (Value|PC)$/, '')
    const colorClass = pastMonthColorMap.get(key)
    return colorClass ? ` ${colorClass}` : ''
  }
  return (
    <div className='relative border-r border-l border-gray-200'>
      <table className='w-full min-w-[2400px] border-collapse text-sm'>
        <thead>
          {/* Month Row */}
          <tr
            className={`sticky top-0 z-30 border-b border-gray-300 dark:bg-gray-900 ${isFullScreen ? 'top-0 bg-blue-100' : 'bg-blue-100'}`}
          >
            {currentMonthHeaders.length > 0 && (
              <th
                colSpan={currentMonthHeaders.length}
                className='border border-r-2 border-gray-300 py-3 text-center font-bold text-blue-900 dark:text-white'
              >
                {monthKey}
              </th>
            )}
            {pastMonthsHeaders.length > 0 && (
              <th
                colSpan={pastMonthsHeaders.length}
                className='border border-l border-gray-300 bg-slate-200 py-3 text-center font-bold text-blue-900 dark:bg-gray-900 dark:text-white'
              >
                Past 12 Months Figures
              </th>
            )}
          </tr>

          {/* Separator Row */}
          <tr className='bg-white'>
            <td
              colSpan={headers.length}
              className='h-px border-t border-gray-300'
            ></td>
          </tr>

          {/* Column Headers */}
          <tr className='sticky top-[45px] z-20 border-b border-gray-300 bg-gray-200'>
            {headers.map((h, i) => {
              const isPastMonthHeader = pastMonthColumnSet.has(h)
              const headerBgClass = isPastMonthHeader
                ? resolvePastMonthClass(h)
                : ''
              return (
                <th
                  key={i}
                  className={`border border-gray-300 px-5 py-3 text-center text-sm font-semibold dark:bg-gray-800 ${h === 'Territory' ? 'sticky left-0 border-l-2 border-blue-500 bg-gray-200 shadow-md' : ''}${headerBgClass}`}
                >
                  {h}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {paginated.map((row, idx) => {
            const isGrandTotal = row['Region Name'] === 'Grand Total'
            const isRegionTotal = row.Area === `${row['Region Name']} Total`
            const isAreaTotal = row.Area.endsWith(' Total') && !isRegionTotal

            return (
              <tr
                key={`${row['Region Name']}-${row.Area}-${row.Territory}-${idx}`}
                className={
                  isGrandTotal
                    ? 'bg-gray-300 font-bold'
                    : isAreaTotal || isRegionTotal
                      ? 'bg-gray-100 font-semibold'
                      : 'group bg-white transition-colors duration-150 hover:bg-gray-100'
                }
              >
                {headers.map((header, i) => {
                  const key = header as keyof RowRecord
                  const originalContent = row[key] ?? '-'
                  let content = originalContent
                  let rowSpan = 1

                  if (key === 'Region Name' || key === 'Area') {
                    rowSpan = getRowSpan(paginated, key, idx)
                    if (rowSpan === 0) return null
                  }

                  if (LABEL_COLUMN_SET.has(key as string)) {
                    if (isGrandTotal) {
                      content = key === 'Region Name' ? 'Grand Total' : ''
                    } else if (isAreaTotal || isRegionTotal) {
                      if (key === 'Territory')
                        content = isAreaTotal ? 'Total' : ''
                    }
                  }

                  const isTerritory = key === 'Territory'
                  const isSalePercent = key === 'Sale (%)'
                  const isDailyColumn = (key as string).match(
                    /^\d{2} (Value|PC)$/
                  )

                  let cellClass =
                    'px-5 py-2 border border-gray-300 whitespace-nowrap text-gray-900'
                  if (!isGrandTotal && !(isAreaTotal || isRegionTotal)) {
                    cellClass += ' group-hover:bg-gray-100 '
                  }
                  if (isTerritory) {
                    cellClass +=
                      ' sticky left-0 shadow-md bg-blue-50 border-l-2 border-blue-500'
                  }
                  if (
                    isSalePercent &&
                    !isGrandTotal &&
                    !(isAreaTotal || isRegionTotal)
                  ) {
                    const saleValue = parseFloat(
                      String(originalContent).replace('%', '')
                    )
                    cellClass +=
                      saleValue >= 95
                        ? ' text-green-600'
                        : saleValue >= 90
                          ? ' text-yellow-600'
                          : ' text-red-600'
                  }
                  if (
                    isDailyColumn &&
                    !isGrandTotal &&
                    !(isAreaTotal || isRegionTotal)
                  ) {
                    const dayMatch = (key as string).match(/^(\d{2})/)
                    if (dayMatch) {
                      const day = parseInt(dayMatch[1], 10) - 1
                      if (day >= 0 && day < dayColors.length) {
                        cellClass += ` ${dayColors[day]}`
                      }
                    }
                  }
                  const isPastMonthColumn = pastMonthColumnSet.has(header)
                  if (
                    isPastMonthColumn &&
                    !isGrandTotal &&
                    !(isAreaTotal || isRegionTotal)
                  ) {
                    cellClass += resolvePastMonthClass(header)
                  }

                  return (
                    <td
                      key={i}
                      rowSpan={rowSpan}
                      className={cellClass}
                      style={
                        isTerritory
                          ? {
                              minWidth: 100,
                              maxWidth: 220,
                              position: 'sticky' as const,
                            }
                          : header === 'Area'
                            ? {
                                textAlign: 'center' as const,
                                minWidth: 100,
                                //maxWidth: 220,
                              }
                            : { textAlign: 'right' as const }
                      }
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function HomeReportTable({
  items,
  periodLabel,
}: HomeReportTableProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const rowsPerPage = isFullScreen ? 50 : 10

  const monthKey = useMemo(() => {
    if (periodLabel) return periodLabel
    const first = items?.[0]
    return first ? `${first.monthName}` : ''
  }, [items, periodLabel])

  const baseMonthIndex = useMemo(
    () => parseMonthIndexFromString(monthKey),
    [monthKey]
  )
  const fallbackPastMonthLabels = useMemo(
    () => getFallbackPastMonthLabels(baseMonthIndex),
    [baseMonthIndex]
  )

  const { headers, data } = useMemo(
    () => buildTableData(items, fallbackPastMonthLabels),
    [items, fallbackPastMonthLabels]
  )

  const processedData = useMemo(() => {
    if (!data.length) return [] as RowRecord[]
    const allRows: RowRecord[] = []
    const regions = Array.from(new Set(data.map((r) => r['Region Name'])))

    for (const regionName of regions) {
      const regionRows = data.filter((r) => r['Region Name'] === regionName)
      if (regionRows.length === 0) continue

      const areas = Array.from(new Set(regionRows.map((r) => r.Area))).sort(
        (a, b) => {
          const numA = parseInt(String(a).split('.')[0], 10)
          const numB = parseInt(String(b).split('.')[0], 10)
          return isNaN(numA) || isNaN(numB)
            ? String(a).localeCompare(String(b))
            : numA - numB
        }
      )

      for (const areaName of areas) {
        const areaTerritoryRows = regionRows.filter((r) => r.Area === areaName)
        allRows.push(...areaTerritoryRows)

        const areaTotal = aggregateRows(areaTerritoryRows, headers)
        areaTotal['Region Name'] = regionName
        areaTotal.Area = `${areaName} Total`
        areaTotal.Territory = 'Total'
        allRows.push(areaTotal)
      }

      const regionTotal = aggregateRows(regionRows, headers)
      regionTotal['Region Name'] = regionName
      regionTotal.Area = `${regionName} Total`
      regionTotal.Territory = ''
      allRows.push(regionTotal)
    }

    const grandTotal = aggregateRows(data, headers)
    grandTotal['Region Name'] = 'Grand Total'
    grandTotal.Area = ''
    grandTotal.Territory = ''
    allRows.push(grandTotal)

    return allRows
  }, [data, headers])

  const filtered = useMemo(() => {
    if (!search) return processedData
    const q = search.toLowerCase()
    return processedData.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [processedData, search])

  useEffect(() => {
    setPage((prevPage) => {
      const maxPage = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
      return prevPage > maxPage ? maxPage : prevPage
    })
  }, [filtered.length, rowsPerPage])

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  // In fullscreen show every row; otherwise only the current page.
  const visibleRows = useMemo(
    () => (isFullScreen ? filtered : paginated),
    [filtered, isFullScreen, paginated]
  )

  const [currentMonthHeaders, pastMonthsHeaders] = useMemo(() => {
    if (headers.length === 0) return [[], []] as [string[], string[]]
    const pastColumnCount = PAST_MONTH_COLUMN_DEFS.length * 2
    if (headers.length <= pastColumnCount) return [[], headers]
    const splitIndex = headers.length - pastColumnCount
    return [headers.slice(0, splitIndex), headers.slice(splitIndex)]
  }, [headers])

  if (!items || items.length === 0) {
    return (
      <div className='py-10 text-center text-lg text-gray-500'>
        No data available
      </div>
    )
  }

  return (
    <div className='relative'>
      {/* Controls */}
      {!isFullScreen && (
        <div className='flex items-center justify-end gap-2 p-2'>
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className='w-full sm:w-64'
          />
          <Button
            size='sm'
            variant='outline'
            onClick={() => setIsFullScreen(true)}
            aria-label='Enter Fullscreen'
          >
            <Fullscreen className='h-4 w-4' />
          </Button>
          <HomeReportExport
            headers={headers}
            currentMonthHeaders={currentMonthHeaders}
            pastMonthsHeaders={pastMonthsHeaders}
            monthKey={monthKey}
            data={filtered}
            renderTable={renderTable}
          />
        </div>
      )}

      {/* Fullscreen Overlay */}
      {isFullScreen && (
        <div className='bg-opacity-95 fixed inset-0 z-2000 flex flex-col bg-white p-6 dark:bg-gray-900'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='text-xl font-semibold text-gray-900'>
              Home Report
            </div>
            <Button
              size='sm'
              onClick={() => setIsFullScreen(false)}
              aria-label='Close Fullscreen'
            >
              <Minimize className='h-4 w-4' />
            </Button>
          </div>
          <div className='mb-2 text-sm font-medium text-gray-900'>
            Period: {monthKey}
          </div>
          <div className='flex-1 overflow-auto'>
            {renderTable(
            headers,
            currentMonthHeaders,
            pastMonthsHeaders,
            monthKey,
            visibleRows,
            true
          )}
        </div>
      </div>
    )}

      {/* Normal Table */}
      {!isFullScreen && (
        <div className='overflow-auto'>
          {renderTable(
          headers,
          currentMonthHeaders,
          pastMonthsHeaders,
          monthKey,
          visibleRows,
          false
        )}
      </div>
    )}

      {!isFullScreen && (
        <div className=''>
          <div className='flex items-center justify-between p-3'>
            <div className='text-sm'>
              Showing {paginated.length} of {filtered.length} results
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className='h-4 w-4' />
                Previous
              </Button>
              <div className='px-2 text-sm'>
                Page {page} of{' '}
                {Math.max(1, Math.ceil(filtered.length / rowsPerPage))}
              </div>
              <Button
                size='sm'
                variant='secondary'
                onClick={() =>
                  setPage((p) =>
                    p * rowsPerPage < filtered.length ? p + 1 : p
                  )
                }
                disabled={page * rowsPerPage >= filtered.length}
              >
                Next
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
