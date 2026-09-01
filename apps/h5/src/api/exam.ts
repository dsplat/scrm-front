import { request } from '../utils/request'

// ========== 类型 ==========

export interface ExamSummary {
  exam_id: number
  title: string
  total_score: number
  pass_score: number
  time_limit_minutes: number
  retry_limit: number
}

export interface ExamQuestion {
  question_id: number
  type: 'single' | 'multi' | 'judge' | 'essay'
  content: string
  options: string[] | null
  score: number
}

export interface ExamStartResult {
  record_id: number
  attempt: number
  started_at: string
  questions: ExamQuestion[]
}

export interface ExamSubmitResult {
  record_id: number
  total_score: number
  passed: boolean
  status: string
  submitted_at: string
}

export interface ExamRecordSummary {
  exam_id: number
  attempt: number
  total_score: number
  passed: boolean
  submitted_at: string | null
}

// ========== 考试 ==========

export function getExams() {
  return request<ExamSummary[]>({ url: '/scrm/student/exams' })
}

export function startExam(examId: string | number) {
  return request<ExamStartResult>({ url: `/scrm/student/exams/${examId}/start`, method: 'POST' })
}

export function submitExam(recordId: string | number, answers: Record<string, unknown>) {
  return request<ExamSubmitResult>({
    url: `/scrm/student/exam-records/${recordId}/submit`,
    method: 'POST',
    data: { answers },
  })
}

export function getMyExamRecords() {
  return request<{ taken: number; passed: number; records: ExamRecordSummary[] }>({
    url: '/scrm/student/exam-records',
  })
}

// ========== 练习/错题本 ==========

export interface PracticeQuestion {
  question_id: number
  type: string
  content: string
  options: string[] | null
  answer: unknown
  analysis: string | null
  score: number
}

export interface PracticeGradeResult {
  correct_count: number
  total_count: number
  detail: Array<{ question_id: number; correct: boolean; answer: unknown }>
  record: { record_id: number; correct_count: number; total_count: number }
}

export function getWrongQuestions(limit = 50) {
  return request<PracticeQuestion[]>({
    url: '/scrm/student/practice/wrong-questions',
    data: { limit },
  })
}

export function startPractice(source: 'wrong' | 'bank', refId = 0, count = 10) {
  return request<PracticeQuestion[]>({
    url: '/scrm/student/practice/start',
    method: 'POST',
    data: { source, ref_id: refId, count },
  })
}

export function gradePractice(
  source: 'wrong' | 'bank',
  refId: number,
  questions: PracticeQuestion[],
  answers: Record<string, unknown>,
) {
  return request<PracticeGradeResult>({
    url: '/scrm/student/practice/grade',
    method: 'POST',
    data: { source, ref_id: refId, questions, answers },
  })
}

export function getPracticeRecords() {
  return request<
    Array<{
      record_id: number
      source: string
      correct_count: number
      total_count: number
      created_at: string
    }>
  >({
    url: '/scrm/student/practice/records',
  })
}
