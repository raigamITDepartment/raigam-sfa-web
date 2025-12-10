import { http } from '@/services/http'
import type { HomeReportParams, HomeReportResponse } from '@/types/home-report'

const BASE = '/api/v1/reports/homeReport'

export async function getHomeReportData(params: HomeReportParams) {
  const res = await http.get<HomeReportResponse>(
    `${BASE}/getHomeReportDataByRequiredArgs`,
    { params }
  )
  return res.data
}

// Re-export types for backwards compatibility
export type {
  HomeReportParams,
  HomeReportItem,
  HomeReportResponse,
} from '@/types/home-report'
