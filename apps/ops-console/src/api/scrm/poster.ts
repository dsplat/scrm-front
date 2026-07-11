import { http } from '@scrm/shared'

export interface Poster {
  id: number
  title: string
  imageUrl: string
  jumpUrl: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface PosterListParams {
  page: number
  pageSize: number
  title?: string
  status?: number
}

export interface PosterListResult {
  data: Poster[]
  total: number
}

export interface CreatePosterData {
  title: string
  imageUrl: string
  jumpUrl?: string
  status: number
}

export interface UpdatePosterData {
  title?: string
  imageUrl?: string
  jumpUrl?: string
  status?: number
}

export async function getPosterList(params: PosterListParams) {
  const res = await http.get<PosterListResult>('/scrm/posters', { params })
  return res.data
}

export async function getPosterDetail(id: number) {
  const res = await http.get<Poster>(`/scrm/posters/${id}`)
  return res.data
}

export async function createPoster(data: CreatePosterData) {
  const res = await http.post('/scrm/posters', data)
  return res.data
}

export async function updatePoster(id: number, data: UpdatePosterData) {
  const res = await http.put(`/scrm/posters/${id}`, data)
  return res.data
}

export async function deletePoster(id: number) {
  const res = await http.delete(`/scrm/posters/${id}`)
  return res.data
}
