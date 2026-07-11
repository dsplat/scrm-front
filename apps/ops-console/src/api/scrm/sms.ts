import { http, type ApiResponse } from '@scrm/shared'

export interface SmsTemplate {
  id: number
  name: string
  content: string
  variables: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  rejectReason: string
  createdAt: string
  updatedAt: string
}

export type SmsTemplateStatus = SmsTemplate['status']

export interface SmsTemplateListParams {
  page: number
  pageSize: number
  name?: string
  status?: SmsTemplateStatus
}

export interface SmsTemplateListResult {
  data: SmsTemplate[]
  total: number
}

export interface CreateSmsTemplateData {
  name: string
  content: string
  variables?: string
}

export interface UpdateSmsTemplateData {
  name?: string
  content?: string
  variables?: string
}

export interface SmsRecord {
  id: number
  templateId: number
  templateName: string
  phone: string
  content: string
  status: 'sending' | 'success' | 'failed'
  failReason: string
  sentAt: string
  createdAt: string
}

export interface SmsRecordListParams {
  page: number
  pageSize: number
  templateId?: number
  templateName?: string
  status?: SmsRecord['status']
}

export interface SmsRecordListResult {
  data: SmsRecord[]
  total: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getSmsTemplateList(
  params: SmsTemplateListParams,
): Promise<SmsTemplateListResult> {
  const res = await http.get<SmsTemplate[]>('/scrm/sms/templates', { params })
  return extractListResult(res)
}

export async function getSmsTemplateDetail(id: number): Promise<SmsTemplate> {
  const res = await http.get<SmsTemplate>(`/scrm/sms/templates/${id}`)
  return res.data as SmsTemplate
}

export async function createSmsTemplate(data: CreateSmsTemplateData): Promise<SmsTemplate> {
  const res = await http.post<SmsTemplate>('/scrm/sms/templates', data)
  return res.data
}

export async function updateSmsTemplate(
  id: number,
  data: UpdateSmsTemplateData,
): Promise<SmsTemplate> {
  const res = await http.put<SmsTemplate>(`/scrm/sms/templates/${id}`, data)
  return res.data
}

export async function deleteSmsTemplate(id: number): Promise<void> {
  await http.delete(`/scrm/sms/templates/${id}`)
}

export async function submitSmsTemplateAudit(id: number): Promise<void> {
  await http.patch(`/scrm/sms/templates/${id}/submit-audit`)
}

export async function getSmsRecordList(params: SmsRecordListParams): Promise<SmsRecordListResult> {
  const res = await http.get<SmsRecord[]>('/scrm/sms/records', { params })
  return extractListResult(res)
}
