import { request } from '../utils/request'

export type TrainingCampStatus = 'draft' | 'active' | 'paused' | 'ended'

export interface TrainingCampActivity {
  check_in_activity_id: number
  title: string
  description: string | null
  cover_url: string | null
  start_date: string
  end_date: string
  status: TrainingCampStatus
  plan_id: number
  total_participants?: number
}

export interface TrainingCampCourseRef {
  course_id: number
  chapter_id: number | null
  course_title: string | null
  chapter_title: string | null
}

export interface TrainingCampMedia {
  type: string
  url: string
}

export interface TrainingCampEvaluation {
  evaluation_id: number
  overall_score: number
  content_score: number
  venue_score: number
  service_score: number
  comment: string | null
  media: TrainingCampMedia[]
  tags: string[]
  created_at: string | null
}

export interface TrainingCampSubmission {
  submission_id: number
  content: string | null
  media: TrainingCampMedia[]
  featured: boolean
  created_at: string | null
  evaluations: TrainingCampEvaluation[]
}

export interface TrainingCampTask {
  task_id: number
  title: string
  scheduled_at: string | null
  instructions: string
  course: TrainingCampCourseRef | null
  completed: boolean
  completed_at: string | null
  submission: TrainingCampSubmission | null
}

export interface TrainingCampProgress {
  completed_count: number
  today_checked: boolean
  streak_count: number
}

export interface TrainingCampDetail {
  activity: TrainingCampActivity
  server_date: string
  today_task_id: number | null
  tasks: TrainingCampTask[]
  progress: TrainingCampProgress
}

export interface SubmitTodayTaskResult {
  activity_id: number
  task_id: number
  submission_id: number
  completed_at: string | null
  completed_count: number
  check_in: {
    check_in_record_id: number
    check_in_date: string
    streak_count: number
    points_awarded: number
    created: boolean
  }
  replayed: boolean
}

export interface SubmitTodayTaskData {
  content?: string
  media?: TrainingCampMedia[]
}

export function getTrainingCampDetail(activityId: string | number) {
  return request<TrainingCampDetail>({
    url: `/biz/training-camps/${activityId}`,
    method: 'GET',
  })
}

export function submitTrainingCampTask(
  activityId: string | number,
  taskId: string | number,
  data: SubmitTodayTaskData,
) {
  return request<SubmitTodayTaskResult>({
    url: `/biz/training-camps/${activityId}/tasks/${taskId}/submit`,
    method: 'POST',
    data,
  })
}
