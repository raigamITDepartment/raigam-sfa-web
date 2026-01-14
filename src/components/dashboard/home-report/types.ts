import type { HomeReportItem } from '@/types/home-report'

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
  | 'past7MonthTotalValue'
  | 'past8MonthTotalValue'
  | 'past9MonthTotalValue'
  | 'past10MonthTotalValue'
  | 'past11MonthTotalValue'
  | 'past12MonthTotalValue'

export type PastMonthPcKey =
  | 'past1MonthTotalPcCount'
  | 'past2MonthTotalPcCount'
  | 'past3MonthTotalPcCount'
  | 'past4MonthTotalPcCount'
  | 'past5MonthTotalPcCount'
  | 'past6MonthTotalPcCount'
  | 'past7MonthTotalPcCount'
  | 'past8MonthTotalPcCount'
  | 'past9MonthTotalPcCount'
  | 'past10MonthTotalPcCount'
  | 'past11MonthTotalPcCount'
  | 'past12MonthTotalPcCount'

export type PastMonthNameKey =
  | 'past1MonthName'
  | 'past2MonthName'
  | 'past3MonthName'
  | 'past4MonthName'
  | 'past5MonthName'
  | 'past6MonthName'
  | 'past7MonthName'
  | 'past8MonthName'
  | 'past9MonthName'
  | 'past10MonthName'
  | 'past11MonthName'
  | 'past12MonthName'

export type PastMonthNumberKey =
  | 'past1MonthNumber'
  | 'past2MonthNumber'
  | 'past3MonthNumber'
  | 'past4MonthNumber'
  | 'past5MonthNumber'
  | 'past6MonthNumber'
  | 'past7MonthNumber'
  | 'past8MonthNumber'
  | 'past9MonthNumber'
  | 'past10MonthNumber'
  | 'past11MonthNumber'
  | 'past12MonthNumber'

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
