import { type MouseEvent, useMemo } from 'react'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>

export type ExcelExportColumn<T extends Record<string, any>> = {
  /**
   * Header/label to show in the exported sheet
   */
  header: string
  /**
   * Accessor to read the value from each row
   */
  accessor?: keyof T | ((row: T, rowIndex: number) => unknown)
  /**
   * Optional formatter that receives the resolved value before stringifying
   */
  formatter?: (value: unknown, row: T, rowIndex: number) => string
  /**
   * Optional className applied to the `<td>` for additional styling.
   */
  cellClassName?:
    | string
    | ((
        value: string,
        row: T,
        rowIndex: number
      ) => string | undefined | null | false)
}

export type ExcelExportButtonProps<T extends Record<string, any>> = {
  /**
   * Table rows to export
   */
  data?: T[]
  /**
   * Column definitions. When omitted we derive them from object keys.
   */
  columns?: ExcelExportColumn<T>[]
  /**
   * Download file name without extension.
   */
  fileName?: string
  /**
   * Optional Excel worksheet name.
   */
  worksheetName?: string
  /**
   * Extra CSS injected into the export document for custom styling.
   */
  customStyles?: string
  /**
   * Invoked right before building the file. Useful for analytics hooks.
   */
  beforeExport?: () => void
  /**
   * Invoked once the file download is triggered.
   */
  afterExport?: () => void
  /**
   * When provided, exports raw HTML instead of generated table markup.
   * Useful for complex layouts that already exist in the DOM.
   */
  getHtmlContent?: () =>
    | {
        html: string
        styles?: string
        worksheetName?: string
      }
    | null
} & ButtonProps

export function ExcelExportButton<T extends Record<string, any>>(
  props: ExcelExportButtonProps<T>
) {
  const {
    data = [],
    columns,
    fileName = 'table-export',
    worksheetName = 'Sheet1',
    customStyles,
    beforeExport,
    afterExport,
    children,
    disabled,
    onClick,
    type,
    getHtmlContent,
    ...buttonProps
  } = props

  const normalizedColumns = useMemo(() => {
    if (columns?.length) return columns
    if (!data.length) return []
    const firstRow = data[0] as Record<string, unknown>
    return Object.keys(firstRow).map((key) => ({
      header: toHeaderCase(key),
      accessor: key as keyof T,
    }))
  }, [columns, data])

  const hasRows = data.length > 0 && normalizedColumns.length > 0
  const canExport = typeof getHtmlContent === 'function' ? true : hasRows

  const handleExport = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!canExport) return
    if (typeof window === 'undefined') return

    beforeExport?.()

    if (customStyles && import.meta.env.DEV) {
      console.warn(
        'ExcelExportButton: customStyles are ignored for .xlsx exports.'
      )
    }

    let effectiveWorksheetName = worksheetName
    let worksheet: XLSX.WorkSheet | null = null

    if (typeof getHtmlContent === 'function') {
      const result = getHtmlContent()
      if (!result?.html) {
        return
      }
      if (result.styles && import.meta.env.DEV) {
        console.warn(
          'ExcelExportButton: custom styles from getHtmlContent are ignored for .xlsx exports.'
        )
      }
      effectiveWorksheetName = result.worksheetName ?? worksheetName
      const container = document.createElement('div')
      container.innerHTML = result.html
      const table = container.querySelector('table')
      if (table) {
        worksheet = XLSX.utils.table_to_sheet(table, { raw: true })
      } else if (hasRows) {
        worksheet = buildWorksheetFromData(normalizedColumns, data)
      } else {
        worksheet = XLSX.utils.aoa_to_sheet([])
      }
    } else {
      worksheet = buildWorksheetFromData(normalizedColumns, data)
    }

    if (!worksheet) return

    const safeWorksheetName = sanitizeWorksheetName(effectiveWorksheetName)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, safeWorksheetName)
    const workbookArray = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const finalFileName = ensureExcelExtension(fileName)
    const blob = new Blob([workbookArray], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    afterExport?.()
  }

  return (
    <Button
      type={type ?? 'button'}
      disabled={disabled || !canExport}
      onClick={handleExport}
      {...buttonProps}
    >
      {children ?? (
        <>
          <Download className='size-4' aria-hidden='true' />
          <span>Export Excel</span>
        </>
      )}
    </Button>
  )
}

function buildWorksheetFromData<T extends Record<string, any>>(
  columns: ExcelExportColumn<T>[],
  data: T[]
) {
  const headerRow = columns.map((column) => column.header)
  const rows = data.map((row, rowIndex) =>
    columns.map((column) => resolveCellValue(row, column, rowIndex))
  )
  return XLSX.utils.aoa_to_sheet([headerRow, ...rows])
}

function resolveCellValue<T extends Record<string, any>>(
  row: T,
  column: ExcelExportColumn<T>,
  rowIndex: number
) {
  let value: unknown

  if (typeof column.accessor === 'function') {
    value = column.accessor(row, rowIndex)
  } else if (column.accessor) {
    value = row[column.accessor]
  } else {
    value = ''
  }

  const formatted =
    typeof column.formatter === 'function'
      ? column.formatter(value, row, rowIndex)
      : value

  return toExcelValue(formatted)
}

function toExcelValue(value: unknown) {
  if (value == null) return ''
  if (value instanceof Date) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function ensureExcelExtension(name: string) {
  const lower = name.toLowerCase()
  return lower.endsWith('.xls') || lower.endsWith('.xlsx')
    ? name
    : `${name}.xlsx`
}

function sanitizeWorksheetName(name: string) {
  const cleaned = (name || 'Sheet1')
    .replace(/[\[\]\*\/\\\?\:]/g, ' ')
    .trim()
  const truncated = cleaned.length ? cleaned.slice(0, 31) : 'Sheet1'
  return truncated
}

function toHeaderCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}
