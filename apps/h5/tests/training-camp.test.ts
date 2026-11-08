import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(appRoot, 'src')

const pageSource = readFileSync(join(srcRoot, 'pages/training-camp/detail.vue'), 'utf8')
const apiSource = readFileSync(join(srcRoot, 'api/training-camp.ts'), 'utf8')
const checkinListSource = readFileSync(join(srcRoot, 'pages/checkin/index.vue'), 'utf8')

test('训练营详情页已注册到 pages.json', () => {
  const manifest = JSON.parse(readFileSync(join(srcRoot, 'pages.json'), 'utf8')) as {
    pages: Array<{ path: string }>
  }
  assert.ok(manifest.pages.some((page) => page.path === 'pages/training-camp/detail'))
})

test('打卡列表仅对 plan_id 非空的活动跳训练营', () => {
  assert.match(checkinListSource, /if \(item\.plan_id\)/)
  assert.match(checkinListSource, /\/pages\/training-camp\/detail\?id=/)
  assert.match(checkinListSource, /\/pages\/checkin\/detail\?id=/)
})

test('训练营详情页保留返回出口', () => {
  assert.match(pageSource, /<NavBar\b/)
  assert.match(pageSource, /<ErrorState\b/)
})

test('今日提交走单一原子端点，不串调打卡/提交列表', () => {
  assert.match(apiSource, /\/biz\/training-camps\/\$\{activityId\}\/tasks\/\$\{taskId\}\/submit/)
  assert.doesNotMatch(pageSource, /\bcheckIn\s*\(/)
  assert.doesNotMatch(pageSource, /getCheckInRecords|getTrainingCampSubmissions|submitSubmission/)
  assert.match(pageSource, /if \(submitting\.value \|\| !todayTask\.value\) return/)
})

test('训练营详情读取当前用户数据并使用服务端今日任务', () => {
  assert.match(apiSource, /\/biz\/training-camps\/\$\{activityId\}`/)
  assert.match(pageSource, /detail\.value\?\.today_task_id/)
  assert.doesNotMatch(pageSource, /v-html/)
})
