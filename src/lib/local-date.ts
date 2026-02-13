const pad2 = (value: number) => String(value).padStart(2, '0')

export const formatLocalDate = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`

export const toLocalDateString = (value?: Date | null) =>
  value ? formatLocalDate(value) : undefined

export const parseLocalDate = (value?: string) => {
  if (!value) return undefined
  const plainMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (plainMatch) {
    const year = Number(plainMatch[1])
    const month = Number(plainMatch[2])
    const day = Number(plainMatch[3])
    const date = new Date(year, month - 1, day)
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return undefined
    }
    return date
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}
