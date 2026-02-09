export type ApiResponse<T> = {
  code: number
  message: string
  payload: T
}

export type Id = number | string
