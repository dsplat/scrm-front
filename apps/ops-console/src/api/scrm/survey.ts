import { http, type ApiResponse } from '@scrm/shared'

export interface SurveyQuestion {
  id?: number
  type: 'radio' | 'checkbox' | 'text' | 'textarea' | 'select'
  title: string
  required: boolean
  options?: string[]
  placeholder?: string
  sortOrder: number
}

export interface Survey {
  id: number
  title: string
  description: string
  status: 'draft' | 'active' | 'closed'
  questionCount: number
  responseCount: number
  questions: SurveyQuestion[]
  createdAt: string
  updatedAt: string
}

export type SurveyAnswerValue = string | string[] | number | boolean | null

export interface SurveyResponse {
  id: number
  surveyId: number
  respondentName: string
  respondentPhone: string
  answers: Record<number, SurveyAnswerValue>
  submittedAt: string
}

export interface SurveyListParams {
  page: number
  pageSize: number
  title?: string
  status?: string
}

export interface SurveyListResult {
  data: Survey[]
  total: number
}

export interface CreateSurveyData {
  title: string
  description?: string
  questions: Omit<SurveyQuestion, 'id'>[]
}

export interface UpdateSurveyData {
  title?: string
  description?: string
  questions?: Omit<SurveyQuestion, 'id'>[]
}

export interface SurveyResponseListParams {
  page: number
  pageSize: number
  surveyId?: number
}

export interface SurveyResponseListResult {
  data: SurveyResponse[]
  total: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getSurveyList(params: SurveyListParams): Promise<SurveyListResult> {
  const res = await http.get<Survey[]>('/scrm/surveys', { params })
  return extractListResult(res)
}

export async function getSurveyDetail(id: number): Promise<Survey> {
  const res = await http.get<Survey>(`/scrm/surveys/${id}`)
  return res.data
}

export async function createSurvey(data: CreateSurveyData): Promise<Survey> {
  const res = await http.post<Survey>('/scrm/surveys', data)
  return res.data
}

export async function updateSurvey(id: number, data: UpdateSurveyData): Promise<Survey> {
  const res = await http.put<Survey>(`/scrm/surveys/${id}`, data)
  return res.data
}

export async function deleteSurvey(id: number): Promise<void> {
  await http.delete(`/scrm/surveys/${id}`)
}

export async function updateSurveyStatus(id: number, status: 'active' | 'closed'): Promise<void> {
  await http.put(`/scrm/surveys/${id}/status`, { status })
}

export async function getSurveyResponseList(params: SurveyResponseListParams): Promise<SurveyResponseListResult> {
  const res = await http.get<SurveyResponse[]>('/scrm/surveys/responses', { params })
  return extractListResult(res)
}
