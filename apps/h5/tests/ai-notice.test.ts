import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  AI_GENERATED_NOTICE,
  isAiNoticeLike,
} from '../src/components/ai-assistant/ai-generated-notice.ts'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(appRoot, 'src')
const read = (path: string) => readFileSync(join(srcRoot, path), 'utf8')

test('合规标识含「AI 生成」字样（微信深度合成类目审核要求）', () => {
  assert.match(AI_GENERATED_NOTICE, /AI\s*生成/)
})

test('AI 标识同义判定：含 AI / 人工智能 即视为已标注', () => {
  assert.equal(isAiNoticeLike('内容由 AI 生成，仅供参考'), true)
  assert.equal(isAiNoticeLike('本服务为人工智能生成内容'), true)
  assert.equal(isAiNoticeLike('工作日 9:00-18:00 回复'), false)
})

test('所有 AI 生成面都挂载合规标识组件', () => {
  // 审核逐页核对：新增 AI 生成入口必须同步挂标识，否则此处失败
  for (const file of [
    'pages/ai-chat/index.vue',
    'pages/secretary/index.vue',
    'components/ai-assistant/AiActionButton.vue',
  ]) {
    assert.match(read(file), /<AiGeneratedNotice\s*\/>/, file)
  }
})

test('标识口径不依赖后端下发文案', () => {
  const api = read('api/user-ai.ts')
  assert.match(api, /disclaimer: '内容由 AI 生成，仅供参考。'/)
})
