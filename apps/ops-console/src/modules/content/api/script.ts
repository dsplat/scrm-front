import { http } from '@scrm/shared'

export interface Script {
  id: number
  title: string
  content: string
  category: string
  tags: string[]
  useCount: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface ScriptListParams {
  page: number
  pageSize: number
  keyword?: string
  category?: string
}

export interface ScriptListResult {
  data: Script[]
  total: number
}

export async function getScriptList(params: ScriptListParams): Promise<ScriptListResult> {
  const res = await http.get<any>('/scrm/scripts', { params })
  return { data: res.data ?? [], total: res.meta?.total ?? res.total ?? 0 }
}

export async function createScript(data: Partial<Script>) {
  const res = await http.post('/scrm/scripts', data)
  return res.data
}

export async function updateScript(id: number, data: Partial<Script>) {
  const res = await http.put(`/scrm/scripts/${id}`, data)
  return res.data
}

export async function deleteScript(id: number) {
  const res = await http.delete(`/scrm/scripts/${id}`)
  return res.data
}

export async function getScriptCategories() {
  const res = await http.get<any>('/scrm/scripts/categories')
  return res.data
}
