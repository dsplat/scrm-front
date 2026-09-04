import { request } from '../utils/request'

/**
 * 线下班培训学员端 API（Training 模块 student/training/* 路由）
 * 身份一律由后端从登录态解析（User → 本人 user_id），媒体上传走
 * scrm 侧无 rbac 的 POST /scrm/uploads（框架 Storage 端点对 User 恒 403）。
 */

export type TrainingMediaType = 'image' | 'video' | 'audio' | 'file'

export interface TrainingMedia {
  type: TrainingMediaType
  url: string
}

/** 班级状态（学员可见：recruiting/running/finished） */
export type TrainingClassStatus = 'planning' | 'recruiting' | 'running' | 'finished' | 'closed'

export interface TrainingClassSummary {
  class_id: number
  name: string
  teacher_name: string | null
  course_id: number | null
  plan_id: number | null
  start_date: string | null
  end_date: string | null
  status: TrainingClassStatus
  metadata?: Record<string, unknown> | null
  joined_at: string | null
  assignment_count: number
  submitted_count: number
  pending_assignment_count: number
}

export interface TrainingReview {
  evaluation_id: number
  score: number
  grade: string
  grade_label: string
  comment: string
  reviewer_id: number | null
  reviewed_at: string | null
}

export interface TrainingSubmission {
  submission_id: number
  content: string | null
  media: TrainingMedia[] | null
  created_at?: string | null
  updated_at?: string | null
  reviewed: boolean
  review: TrainingReview | null
}

export interface TrainingAssignment {
  assignment_id: number
  class_id: number
  title: string
  content: string | null
  due_at: string | null
  phase_key: string | null
  status: string
  class_name: string
  submitted: boolean
  submission: TrainingSubmission | null
  /** 详情接口独有：所属班信息 */
  class?: Record<string, any>
}

/** 我的班级列表（我所在且招生/进行中/已结课的班，含待办作业数） */
export function getMyTrainingClasses() {
  return request<TrainingClassSummary[]>({
    url: '/scrm/student/training/classes',
    method: 'GET',
  })
}

/** 我可见的作业列表（仅已发布；可按班过滤） */
export function getStudentAssignments(params?: { class_id?: number }) {
  return request<TrainingAssignment[]>({
    url: '/scrm/student/training/assignments',
    method: 'GET',
    data: params,
  })
}

/** 作业详情 + 我的提交与评审回显 */
export function getStudentAssignment(assignmentId: string | number) {
  return request<TrainingAssignment>({
    url: `/scrm/student/training/assignments/${assignmentId}`,
    method: 'GET',
  })
}

/** 提交/重新提交（重复提交 = 覆盖更新） */
export function submitStudentAssignment(
  assignmentId: string | number,
  data: { content?: string; media?: TrainingMedia[] },
) {
  return request<TrainingSubmission>({
    url: `/scrm/student/training/assignments/${assignmentId}/submit`,
    method: 'POST',
    data,
  })
}

/** 学员媒体上传（multipart；框架 FileService 落盘，返回可访问 url） */
export function uploadTrainingFile(filePath: string, category = 'training'): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('user_token')
    const header: Record<string, string> = {}
    if (token) header['Authorization'] = `Bearer ${token}`

    uni.uploadFile({
      url: `/api/v1/scrm/uploads`,
      filePath,
      name: 'file',
      formData: { category },
      header,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let message = `上传失败（HTTP ${res.statusCode}）`
          try {
            const body = JSON.parse(res.data as string)
            if (body?.message) message = body.message
          } catch {
            /* 非 JSON 响应保持默认提示 */
          }
          reject(new Error(message))
          return
        }
        try {
          const body = JSON.parse(res.data as string)
          const url = body?.data?.url
          if (!url) {
            reject(new Error('上传响应缺少文件地址'))
            return
          }
          resolve(url as string)
        } catch {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络上传失败'))
      },
    })
  })
}
