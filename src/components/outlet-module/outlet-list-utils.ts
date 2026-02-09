import { format, isValid, parse } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { OutletRecord } from '@/types/outlet'

export const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export const pickFirstValue = <K extends keyof OutletRecord>(
  row: OutletRecord,
  keys: K[]
): OutletRecord[K] | undefined => {
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return undefined
}

export const normalizeBool = (value: unknown) => {
  if (value === true || value === 'true' || value === 1 || value === '1')
    return true
  if (value === false || value === 'false' || value === 0 || value === '0')
    return false
  return Boolean(value)
}

export const buildFacetOptions = (values: (string | undefined | null)[]) => {
  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value !== '')

  return Array.from(new Set(normalized)).map((value) => ({
    label: value,
    value,
  }))
}

export const parseCreatedDate = (value: unknown) => {
  if (!value) return undefined
  if (value instanceof Date) return isValid(value) ? value : undefined
  if (typeof value === 'number') {
    const date = new Date(value)
    return isValid(date) ? date : undefined
  }
  const text = String(value).trim()
  if (!text) return undefined
  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm",
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'yyyy-MM-dd HH:mm:ss.SSS',
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
  ]
  for (const formatString of formats) {
    const parsed = parse(text, formatString, new Date())
    if (isValid(parsed)) return parsed
  }
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const direct = new Date(normalized)
  if (isValid(direct)) return direct
  if (text.length >= 10) {
    const dateOnly = text.slice(0, 10)
    for (const formatString of formats.slice(0, 4)) {
      const parsed = parse(dateOnly, formatString, new Date())
      if (isValid(parsed)) return parsed
    }
  }
  return undefined
}

export const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from) return 'Created Date Range'
  if (!range.to) return format(range.from, 'MMM d, yyyy')
  return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
}
