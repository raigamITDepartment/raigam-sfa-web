import { useMemo, useRef, type ReactNode } from 'react'
import {
  ExcelExportButton,
  type ExcelExportColumn,
} from '@/components/excel-export-button'
import type { RowRecord } from './types'

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
    .bg-slate-50 { background-color: #F8FAFC; }
    .bg-slate-100 { background-color: #E2E8F0; }
    .bg-slate-200 { background-color: #CBD5F5; }
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

type Props = {
  headers: string[]
  currentMonthHeaders: string[]
  pastMonthsHeaders: string[]
  monthKey: string
  data: RowRecord[]
  renderTable: (
    headers: string[],
    currentMonthHeaders: string[],
    pastMonthsHeaders: string[],
    monthKey: string,
    paginated: RowRecord[],
    isFullScreen: boolean
  ) => ReactNode
}

export default function HomeReportExport({
  headers,
  currentMonthHeaders,
  pastMonthsHeaders,
  monthKey,
  data,
  renderTable,
}: Props) {
  const exportRef = useRef<HTMLDivElement | null>(null)
  const exportStyles = useMemo(() => buildExportCss(), [])

  const exportColumns = useMemo<ExcelExportColumn<RowRecord>[]>(() => {
    if (!headers.length) return []
    return headers.map((header) => ({
      header,
      accessor: (row) => row[header] ?? '',
    }))
  }, [headers])

  const exportFileName = useMemo(
    () => `Home_Report_${monthKey || 'report'}`,
    [monthKey]
  )

  const worksheetName = monthKey || 'Home Report'

  const getHtmlContent = () => {
    const html = exportRef.current?.innerHTML ?? ''
    if (!html) return null
    return {
      html,
      styles: exportStyles,
      worksheetName,
    }
  }

  return (
    <>
      <ExcelExportButton
        size='sm'
        variant='outline'
        data={data}
        columns={exportColumns}
        fileName={exportFileName}
        worksheetName={worksheetName}
        customStyles={exportStyles}
        aria-label='Download Excel'
        title='Download Excel (.xls)'
        getHtmlContent={getHtmlContent}
      />

      {/* Hidden full table for export */}
      <div className='hidden' ref={exportRef} aria-hidden>
        {renderTable(
          headers,
          currentMonthHeaders,
          pastMonthsHeaders,
          monthKey,
          data,
          false
        )}
      </div>
    </>
  )
}
