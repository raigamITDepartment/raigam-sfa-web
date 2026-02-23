import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

export const ACHIEVEMENT_REPORT_BASE = '/api/v1/reports/achievementReport'

export type AchievementDataParams = {
  subChannelId: number | string
  rangeId?: number | string
  areaId: number | string
  startDate: string
  endDate: string
}

export async function getAchievementData(params: AchievementDataParams) {
  const res = await http.get<ApiResponse<unknown>>(ACHIEVEMENT_REPORT_BASE, {
    params,
  })
  return res.data
}
