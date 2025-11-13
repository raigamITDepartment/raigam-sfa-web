import { http } from '@/services/http'

export type HomeReportParams = {
  subChannelId?: number
  month?: number
  year?: number
  rangeId?: number
  areaId?: number
}

export type HomeReportItem = {
  channelId: number
  channelName: string
  subChannelId: number
  subChannelName: string
  regionId: number
  regionName: string
  areaId: number
  areaDisplayOrder: number
  areaName: string
  territoryId: number
  territoryName: string
  monthName: string
  monthNumber: number
  givenWorkingDays: number | null
  workingDays: number
  pcTarget: number
  valueTarget: number
  day01Count: number
  day01Value: number
  day02Count: number
  day02Value: number
  day03Count: number
  day03Value: number
  day04Count: number
  day04Value: number
  day05Count: number
  day05Value: number
  day06Count: number
  day06Value: number
  day07Count: number
  day07Value: number
  day08Count: number
  day08Value: number
  day09Count: number
  day09Value: number
  day10Count: number
  day10Value: number
  day11Count: number
  day11Value: number
  day12Count: number
  day12Value: number
  day13Count: number
  day13Value: number
  day14Count: number
  day14Value: number
  day15Count: number
  day15Value: number
  day16Count: number
  day16Value: number
  day17Count: number
  day17Value: number
  day18Count: number
  day18Value: number
  day19Count: number
  day19Value: number
  day20Count: number
  day20Value: number
  day21Count: number
  day21Value: number
  day22Count: number
  day22Value: number
  day23Count: number
  day23Value: number
  day24Count: number
  day24Value: number
  day25Count: number
  day25Value: number
  day26Count: number
  day26Value: number
  day27Count: number
  day27Value: number
  day28Count: number
  day28Value: number
  day29Count: number
  day29Value: number
  day30Count: number
  day30Value: number
  day31Count: number
  day31Value: number
  totalCount: number
  totalValue: number
}

export type HomeReportResponse = {
  code: number
  message: string
  payload: HomeReportItem[]
}

const BASE = '/api/v1/reports/homeReport'

export async function getHomeReportData(params: HomeReportParams) {
  const res = await http.get<HomeReportResponse>(
    `${BASE}/getHomeReportDataByRequiredArgs`,
    { params }
  )
  return res.data
}
