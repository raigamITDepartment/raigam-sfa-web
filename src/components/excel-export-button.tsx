import { type MouseEvent, useMemo } from 'react'
import { Download } from 'lucide-react'
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

  const handleExport = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!hasRows) return
    if (typeof window === 'undefined') return

    beforeExport?.()

    const doc = buildExcelDocument({
      columns: normalizedColumns,
      data,
      worksheetName,
      customStyles,
    })
    const finalFileName = ensureExcelExtension(fileName)
    const blob = new Blob([doc], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
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
      disabled={disabled || !hasRows}
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

type BuildDocumentArgs<T extends Record<string, any>> = {
  columns: ExcelExportColumn<T>[]
  data: T[]
  worksheetName: string
  customStyles?: string
}

function buildExcelDocument<T extends Record<string, any>>(
  args: BuildDocumentArgs<T>
) {
  const { columns, data, worksheetName, customStyles } = args
  const headerRow = `<tr>${columns
    .map((column) => `<th>${escapeHtml(column.header)}</th>`)
    .join('')}</tr>`
  const bodyRows = data
    .map((row, rowIndex) => {
      const cells = columns
        .map((column) => {
          const cell = getCellData(row, column, rowIndex)
          const className = cell.className
            ? ` class="${escapeHtml(cell.className)}"`
            : ''
          return `<td${className}>${escapeHtml(cell.value)}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const tableMarkup = `<table role="table"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`
  const styles = `
table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
th { background-color: #f4f4f5; font-weight: 600; }
tbody tr:nth-child(even) { background-color: #fafafa; }
${customStyles ?? ''}
`

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(worksheetName || 'Worksheet')}</title>
    <style>${styles}</style>
  </head>
  <body>${tableMarkup}</body>
</html>`
}

type CellData = {
  value: string
  className?: string
}

function getCellData<T extends Record<string, any>>(
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

  const stringValue = toCellString(formatted)
  const className =
    typeof column.cellClassName === 'function'
      ? column.cellClassName(stringValue, row, rowIndex) || undefined
      : column.cellClassName

  return {
    value: stringValue,
    className: className || undefined,
  }
}

function toCellString(value: unknown) {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function escapeHtml(value: string) {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ensureExcelExtension(name: string) {
  return name.toLowerCase().endsWith('.xls') || name.toLowerCase().endsWith('.xlsx')
    ? name
    : `${name}.xls`
}

function toHeaderCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}
