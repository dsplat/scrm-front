/**
 * C端课程 API — 浏览 / 购买 / 学习进度 / 我的课程
 */
import { request } from '../utils/request'
import type { OrderVO } from './shop'

export interface CourseVO {
  course_id: number
  title: string
  cover?: string | null
  description?: string | null
  price: string | number
  points_price: number
  sale_mode: 'cash' | 'points' | 'mixed'
  completion_reward_points: number
  status: string
}

export interface ChapterVO {
  chapter_id: number
  sort_order: number
  title: string
  type: 'text' | 'video' | 'file'
  content?: string | null
  file_url?: string | null
  /** 未购买时内容体被隐藏 */
  locked?: boolean
}

export interface CourseDetailResult {
  course: CourseVO
  chapters: ChapterVO[]
  has_access: boolean
}

export interface MyCourseItem {
  course: CourseVO
  progress: number
  completed_at?: string | null
}

/** 已发布课程列表 */
export async function getPublishedCourses(): Promise<{ data: CourseVO[]; total: number }> {
  return request({
    url: '/scrm/courses/published',
    method: 'GET',
  })
}

/** 课程详情（未购买隐藏章节内容） */
export async function getCourseDetail(id: number): Promise<CourseDetailResult> {
  return request({
    url: `/scrm/courses/${id}/detail`,
    method: 'GET',
  })
}

/** 购买课程（统一订单 order_type=course） */
export async function purchaseCourse(
  id: number,
  opts?: { pay_method?: 'cash' | 'points' | 'mixed'; points_to_use?: number },
): Promise<OrderVO> {
  return request({
    url: `/scrm/courses/${id}/purchase`,
    method: 'POST',
    data: opts ?? {},
  })
}

/** 上报章节学习进度 */
export async function reportLearningProgress(
  courseId: number,
  chapterId: number,
): Promise<{ completed_now: boolean; reward_granted: number }> {
  return request({
    url: '/scrm/learning-records',
    method: 'POST',
    data: { course_id: courseId, chapter_id: chapterId },
  })
}

/** 我的课程 */
export async function getMyCourses(): Promise<MyCourseItem[]> {
  return request({
    url: '/scrm/my/courses',
    method: 'GET',
  })
}
