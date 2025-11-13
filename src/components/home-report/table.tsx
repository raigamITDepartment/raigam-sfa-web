import { useMemo, useRef, useState } from 'react'
import type { HomeReportItem } from '@/services/reports/homeReportApi'
import {
  ChevronLeft,
  ChevronRight,
  Maximize as Fullscreen,
  Minimize,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type RowRecord = {
  [key: string]: string | number
  'Region Name': string
  Area: string
  Territory: string
  Target: string
  'Total-Value': string
  'Variance - Cum Target vs': string
  'Sale (%)': string
  'PC-Target': string | number
  'Total-PC': string | number
  'Avg PC': string | number
  'Given WD': string | number
  WD: string | number
  'WD Variance': string | number
  'Avg (With Direct)': string | number
}

type Props = {
  items: HomeReportItem[]
  periodLabel?: string
}

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

const parseNum = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0
  const s = String(v).replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
const isPercentHeader = (h: string) => h.includes('%')
const isAverageHeader = (h: string) => /avg/i.test(h)
const isPCHeader = (h: string) => /PC$/.test(h)

const aggregateRows = (rows: RowRecord[], headers: string[]): RowRecord => {
  const labelCols = new Set(['Region Name', 'Area', 'Territory'])
  const out: RowRecord = {
    'Region Name': '',
    Area: '',
    Territory: '',
    Target: '0',
    'Total-Value': '0',
    'Variance - Cum Target vs': '0',
    'Sale (%)': '0% ',
    'PC-Target': '0',
    'Total-PC': '0',
    'Avg PC': '0',
    'Given WD': '0',
    WD: '0',
    'WD Variance': '0',
    'Avg (With Direct)': '0',
  }

  for (const h of headers) {
    if (labelCols.has(h)) continue
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
  const value = rows[startIdx][key]
  if (startIdx > 0 && rows[startIdx - 1][key] === value) return 0
  let span = 1
  for (let i = startIdx + 1; i < rows.length; i++) {
    if (rows[i][key] === value) span++
    else break
  }
  return span
}

function renderTable(
  headers: string[],
  currentMonthHeaders: string[],
  pastMonthsHeaders: string[],
  monthKey: string,
  paginated: RowRecord[],
  isFullScreen: boolean
) {
  return (
    <div className='relative border-r border-l border-gray-200'>
      <table className='w-full min-w-[2400px] border-collapse text-sm'>
        <thead>
          {/* Month Row */}
          <tr
            className={`sticky top-0 z-30 dark:bg-gray-900 ${isFullScreen ? 'top-0 bg-blue-100' : 'bg-blue-100'}`}
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
                className='border border-gray-300 py-3 text-center font-bold text-blue-900 dark:text-white'
              >
                Past 6 Months Figures
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
          <tr className='sticky top-[45px] z-20 bg-gray-200'>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`border border-gray-300 px-5 py-3 text-center text-sm font-semibold dark:bg-gray-800 ${h === 'Territory' ? 'sticky left-0 border-l-2 border-blue-500 bg-gray-200 shadow-md' : ''}`}
              >
                {h}
              </th>
            ))}
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

                  const labelCols = new Set([
                    'Region Name',
                    'Area',
                    'Territory',
                  ])
                  if (labelCols.has(key as string)) {
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

export default function HomeReportTable({ items, periodLabel }: Props) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const rowsPerPage = isFullScreen ? 50 : 10
  const tableRef = useRef<HTMLDivElement | null>(null)
  const exportRef = useRef<HTMLDivElement | null>(null)

  const buildExportCss = () => `
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, 'Apple Color Emoji', 'Segoe UI Emoji'; color: #111827; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    thead tr th { text-align: center; }
    th, td { border: 1px solid #D1D5DB; padding: 6px 10px; white-space: nowrap; }
    /* Borders and spacing utilities */
    .border { border: 1px solid #D1D5DB; }
    .border-gray-300 { border-color: #D1D5DB !important; }
    .border-blue-500 { border-color: #3B82F6 !important; }
    .border-l-2 { border-left-width: 2px; }
    .border-r-2 { border-right-width: 2px; }
    .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .whitespace-nowrap { white-space: nowrap; }
    /* Basic backgrounds */
    .bg-white { background-color: #ffffff; }
    .bg-gray-100 { background-color: #F3F4F6; }
    .bg-gray-200 { background-color: #E5E7EB; }
    .bg-gray-300 { background-color: #D1D5DB; }
    .bg-blue-100 { background-color: #DBEAFE; }
    /* Tailwind 50 shades used for daily columns */
    .bg-blue-50 { background-color: #EFF6FF; }
    .bg-green-50 { background-color: #F0FDF4; }
    .bg-yellow-50 { background-color: #FFFBEB; }
    .bg-red-50 { background-color: #FEF2F2; }
    .bg-purple-50 { background-color: #FAF5FF; }
    .bg-pink-50 { background-color: #FDF2F8; }
    .bg-indigo-50 { background-color: #EEF2FF; }
    .bg-teal-50 { background-color: #F0FDFA; }
    .bg-cyan-50 { background-color: #ECFEFF; }
    .bg-amber-50 { background-color: #FFFBEB; }
    .bg-lime-50 { background-color: #F7FEE7; }
    .bg-emerald-50 { background-color: #ECFDF5; }
    .bg-sky-50 { background-color: #F0F9FF; }
    .bg-violet-50 { background-color: #F5F3FF; }
    .bg-fuchsia-50 { background-color: #FDF4FF; }
    .bg-rose-50 { background-color: #FFF1F2; }
    .bg-orange-50 { background-color: #FFF7ED; }
    .bg-gray-50 { background-color: #F9FAFB; }
    /* Tailwind 100 shades used for daily columns */
    .bg-blue-100 { background-color: #DBEAFE; }
    .bg-green-100 { background-color: #DCFCE7; }
    .bg-yellow-100 { background-color: #FEF3C7; }
    .bg-red-100 { background-color: #FEE2E2; }
    .bg-purple-100 { background-color: #F3E8FF; }
    .bg-pink-100 { background-color: #FCE7F3; }
    .bg-indigo-100 { background-color: #E0E7FF; }
    .bg-teal-100 { background-color: #CCFBF1; }
    .bg-cyan-100 { background-color: #CFFAFE; }
    .bg-amber-100 { background-color: #FEF3C7; }
    .bg-lime-100 { background-color: #ECFCCB; }
    .bg-emerald-100 { background-color: #D1FAE5; }
    .bg-sky-100 { background-color: #E0F2FE; }
    .bg-violet-100 { background-color: #EDE9FE; }
    .bg-fuchsia-100 { background-color: #FAE8FF; }
    .bg-rose-100 { background-color: #FFE4E6; }
    .bg-orange-100 { background-color: #FFEDD5; }
    /* Text colors used */
    .text-blue-900 { color: #1E3A8A; }
    .text-green-600 { color: #16A34A; }
    .text-yellow-600 { color: #CA8A04; }
    .text-red-600 { color: #DC2626; }
    .text-gray-900 { color: #111827; }
    /* Simple utility equivalents */
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .sticky { position: sticky; }
    .left-0 { left: 0; }
  `

  const handleExportExcel = () => {
    const html =
      exportRef.current?.innerHTML || tableRef.current?.innerHTML || ''
    const styles = buildExportCss()
    const content = `<!doctype html><html><head><meta charset="utf-8"/><style>${styles}</style></head><body>${html}</body></html>`
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Home_Report_${monthKey || 'report'}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const monthKey = useMemo(() => {
    if (periodLabel) return periodLabel
    const first = items?.[0]
    return first ? `${first.monthName}` : ''
  }, [items, periodLabel])

  const { headers, data } = useMemo(() => {
    if (!items || items.length === 0)
      return { headers: [] as string[], data: [] as RowRecord[] }

    const daysWithData = new Set<string>()
    for (let i = 1; i <= 31; i++) {
      const day = i.toString().padStart(2, '0')
      const has = items.some(
        (it) =>
          (it as any)[`day${day}Value`] > 0 || (it as any)[`day${day}Count`] > 0
      )
      if (has) daysWithData.add(day)
    }

    const headers: string[] = ['Region Name', 'Area', 'Territory']
    daysWithData.forEach((day) => {
      headers.push(`${day} Value`, `${day} PC`)
    })
    headers.push(
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
      'Avg (With Direct)'
    )

    const rows: RowRecord[] = items.map((item) => {
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
        const v = Math.round(
          (item as any)[`day${day}Value`] || 0
        ).toLocaleString('en-LK')
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

      return row
    })

    return { headers, data: rows }
  }, [items])

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

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const [currentMonthHeaders, pastMonthsHeaders] = useMemo(() => {
    if (headers.length === 0) return [[], []] as [string[], string[]]
    const idx = headers.findIndex((h) => h.includes('Total-PC'))
    if (idx === -1) return [headers, []]
    return [headers.slice(0, idx + 1), headers.slice(idx + 1)]
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
          <Button
            size='sm'
            variant='outline'
            onClick={handleExportExcel}
            aria-label='Download Excel'
            title='Download Excel (.xls)'
          >
            <Download className='h-4 w-4' />
          </Button>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {isFullScreen && (
        <div className='bg-opacity-95 fixed inset-0 z-[2000] flex flex-col bg-white p-6 dark:bg-gray-900'>
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
              paginated,
              true
            )}
          </div>
        </div>
      )}

      {/* Normal Table */}
      {!isFullScreen && (
        <div className='overflow-auto' ref={tableRef}>
          {renderTable(
            headers,
            currentMonthHeaders,
            pastMonthsHeaders,
            monthKey,
            paginated,
            false
          )}
        </div>
      )}

      {/* Hidden full table for print/export (no pagination) */}
      <div className='hidden' ref={exportRef} aria-hidden>
        {renderTable(
          headers,
          currentMonthHeaders,
          pastMonthsHeaders,
          monthKey,
          filtered,
          false
        )}
      </div>

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
