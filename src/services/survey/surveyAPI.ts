import { http } from '@/services/http'
import type { ApiResponse } from '@/types/common'

export const SURVEY_BASE = '/api/v1/sales/survey'
export const SURVEY_REPORTS_BASE =
  '/api/v1/reports/surveyReports/getSurveyResults'

export type SaveSurveyDataPayload = Record<string, unknown>
export type SaveSurveyDataResponse<T = unknown> = ApiResponse<T>
export type SurveyResultItem = {
  subChannelName: string
  areaName: string
  territoryName: string
  userId: number
  userName: string
  dayTarget: number
  dayCount: number
  surveyDate: string
  surveyCount: number
  timeFrameCount: number
  outOfTimeFrameCount: number
}
export type GetSurveyResultsResponse = ApiResponse<SurveyResultItem[]>

export async function saveSurveyData<T = unknown>(
  payload: SaveSurveyDataPayload
): Promise<SaveSurveyDataResponse<T>> {
  const res = await http.post<
    SaveSurveyDataResponse<T> | { code?: number | string; message?: string }
  >(SURVEY_BASE, payload, {
    headers: {
      'X-Skip-Auth': 'true',
    },
    // Some backends return business success in body (code: 201) with non-2xx HTTP.
    validateStatus: () => true,
  })

  const data = res.data
  const rawCode = data && typeof data === 'object' ? data.code : undefined
  const code =
    typeof rawCode === 'number'
      ? rawCode
      : typeof rawCode === 'string'
        ? Number(rawCode)
        : undefined

  const isHttpSuccess = res.status >= 200 && res.status < 300
  const isBusinessSuccess = code === 200 || code === 201

  if (isHttpSuccess || isBusinessSuccess) {
    return data as SaveSurveyDataResponse<T>
  }

  const message =
    data && typeof data === 'object' && typeof data.message === 'string'
      ? data.message
      : `Failed to save survey data (HTTP ${res.status}).`
  throw new Error(message)
}

export async function getSurveyResults(): Promise<GetSurveyResultsResponse> {
  const res = await http.get<GetSurveyResultsResponse>(SURVEY_REPORTS_BASE)
  return res.data
}
