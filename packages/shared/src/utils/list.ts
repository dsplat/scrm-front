import type { ApiResponse } from '../api-client/http'

export interface ListResult<T> {
  data: T[]
  total: number
}

export function extractListResult<T>(res: ApiResponse<T[]>): ListResult<T> {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}
