import { http, type ApiResponse } from '@scrm/shared'

export interface SmsTemplate {
  id: number
  name: string
  content: string
  variables: string[]
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  rejectReason: string | null
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
}

export interface UpdateSmsTemplateData {
  name?: string
  content?: string
}

export interface SmsSendRecord {
  id: number
  templateId: number
  templateName: string
  content: string
  recipientCount: number
  successCount: number
  failCount: number
  status: 'pending' | 'sending' | 'completed' | 'failed'
  sentAt: string | null
  createdAt: string
}

export type SmsSendRecordStatus = SmsSendRecord['status']

export interface SmsSendRecordListParams {
  page: number
  pageSize: number
  templateId?: number
  status?: SmsSendRecordStatus
}

export interface SmsSendRecordListResult {
  data: SmsSendRecord[]
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
  return res.data
}

export async function createSmsTemplate(data: CreateSmsTemplateData): Promise<void> {
  await http.post('/scrm/sms/templates', data)
}

export async function updateSmsTemplate(id: number, data: UpdateSmsTemplateData): Promise<void> {
  await http.put(`/scrm/sms/templates/${id}`, data)
}

export async function deleteSmsTemplate(id: number): Promise<void> {
  await http.delete(`/scrm/sms/templates/${id}`)
}

export async function submitSmsTemplateAudit(id: number): Promise<void> {
  await http.post(`/scrm/sms/templates/${id}/submit-audit`)
}

export async function getSmsSendRecordList(
  params: SmsSendRecordListParams,
): Promise<SmsSendRecordListResult> {
  const res = await http.get<SmsSendRecord[]>('/scrm/sms/send-records', { params })
  return extractListResult(res)
}
