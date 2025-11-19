import type { ApiResponse } from './types'
import { http } from '../http'

const extractPayload = <T>(request: Promise<{ data: ApiResponse<T> }>) =>
  request.then((response) => response.data)

export const get = <T>(path: string) =>
  extractPayload(http.get<ApiResponse<T>>(path))

export const post = <T, B>(path: string, body: B) =>
  extractPayload(http.post<ApiResponse<T>>(path, body))

export const put = <T, B>(path: string, body: B) =>
  extractPayload(http.put<ApiResponse<T>>(path, body))

export const del = <T>(path: string) =>
  extractPayload(http.delete<ApiResponse<T>>(path))
