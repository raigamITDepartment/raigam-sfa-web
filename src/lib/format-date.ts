import { format, isValid, parse } from 'date-fns'

const DEFAULT_DATE_FORMAT = 'dd MMM yyyy'
const DEFAULT_DATE_TIME_FORMAT = 'dd MMM yyyy, hh:mm a'
const COMMON_PARSE_FORMATS = [
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
] as const

const hasTimeTokens = (formatString: string) => /[HhmsS]/.test(formatString)

const hasTimeText = (text: string) => /\d{1,2}:\d{2}/.test(text)

const isMidnight = (value: Date) =>
  value.getHours() === 0 &&
  value.getMinutes() === 0 &&
  value.getSeconds() === 0 &&
  value.getMilliseconds() === 0

type ParsedDateValue = {
  date: Date
  hasTime: boolean
}

const parseDateValue = (value: string): ParsedDateValue | undefined => {
  const text = value.trim()
  if (!text) return undefined
  if (text.startsWith('0001-01-01')) return undefined
  for (const formatString of COMMON_PARSE_FORMATS) {
    const parsed = parse(text, formatString, new Date())
    if (isValid(parsed)) {
      return {
        date: parsed,
        hasTime: hasTimeTokens(formatString) && !isMidnight(parsed),
      }
    }
  }
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const direct = new Date(normalized)
  if (isValid(direct)) {
    return {
      date: direct,
      hasTime: hasTimeText(text) && !isMidnight(direct),
    }
  }
  if (text.length >= 10) {
    const dateOnly = text.slice(0, 10)
    for (const formatString of COMMON_PARSE_FORMATS.slice(0, 4)) {
      const parsed = parse(dateOnly, formatString, new Date())
      if (isValid(parsed)) {
        return { date: parsed, hasTime: false }
      }
    }
  }
  return undefined
}

export function formatDate(
  value?: Date | string | number | null,
  formatString: string = DEFAULT_DATE_TIME_FORMAT
) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') {
    const parsed = parseDateValue(value)
    if (!parsed) return value
    const nextFormat =
      formatString === DEFAULT_DATE_TIME_FORMAT
        ? parsed.hasTime
          ? DEFAULT_DATE_TIME_FORMAT
          : DEFAULT_DATE_FORMAT
        : formatString
    return format(parsed.date, nextFormat)
  }
  const date = value instanceof Date ? value : new Date(value)
  if (!isValid(date)) return '-'
  const nextFormat =
    formatString === DEFAULT_DATE_TIME_FORMAT && isMidnight(date)
      ? DEFAULT_DATE_FORMAT
      : formatString
  return format(date, nextFormat)
}
