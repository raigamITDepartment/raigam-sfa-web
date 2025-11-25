import type { HomeReportItem } from '@/services/reports/homeReportApi'

export type RowRecord = {
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

export type PastMonthValueKey =
  | 'past1MonthTotalValue'
  | 'past2MonthTotalValue'
  | 'past3MonthTotalValue'
  | 'past4MonthTotalValue'
  | 'past5MonthTotalValue'
  | 'past6MonthTotalValue'

export type PastMonthPcKey =
  | 'past1MonthTotalPcCount'
  | 'past2MonthTotalPcCount'
  | 'past3MonthTotalPcCount'
  | 'past4MonthTotalPcCount'
  | 'past5MonthTotalPcCount'
  | 'past6MonthTotalPcCount'

export type PastMonthNameKey =
  | 'past1MonthName'
  | 'past2MonthName'
  | 'past3MonthName'
  | 'past4MonthName'
  | 'past5MonthName'
  | 'past6MonthName'

export type PastMonthNumberKey =
  | 'past1MonthNumber'
  | 'past2MonthNumber'
  | 'past3MonthNumber'
  | 'past4MonthNumber'
  | 'past5MonthNumber'
  | 'past6MonthNumber'

export type PastMonthColumnDef = {
  index: number
  defaultLabel: string
  valueKey: PastMonthValueKey
  pcKey: PastMonthPcKey
  nameKey: PastMonthNameKey
  numberKey: PastMonthNumberKey
}

export type PastMonthMeta = PastMonthColumnDef & {
  label: string
  valueHeader: string
  pcHeader: string
}

export type HomeReportTableProps = {
  items: HomeReportItem[]
  periodLabel?: string
}
