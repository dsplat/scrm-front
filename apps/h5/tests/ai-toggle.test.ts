import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(appRoot, 'src')
const read = (path: string) => readFileSync(join(srcRoot, path), 'utf8')

test('工作台接口解析租户 AI 总开关，旧后端缺字段按启用处理', () => {
  const api = read('api/workbench.ts')
  assert.match(api, /ai_enabled: boolean/)
  assert.match(api, /ai_enabled: source\.ai_enabled !== false/)
  assert.match(api, /ai_enabled: true/)
})

test('AI 可用性 store 单次请求且失败按可用处理', () => {
  const store = read('store/ai.ts')
  assert.match(store, /\{ loaded: false, enabled: true \}/)
  assert.match(store, /if \(state\.loaded\) return Promise\.resolve\(\)/)
  assert.match(store, /if \(!workbench\.fallback\) applyAiEnabled\(workbench\.ai_enabled\)/)
})

test('全部 C 端 AI 入口受开关约束', () => {
  // 关闭 AI 后这些入口必须一并消失，否则审核仍会看到 AI 功能
  const gated: Array<[string, RegExp]> = [
    ['components/SecretaryFab.vue', /aiState\.enabled/],
    ['components/ai-assistant/AiActionButton.vue', /v-if="aiState\.enabled"/],
    ['pages/index/index.vue', /v-if="aiState\.enabled" class="secretary-entry"/],
    ['pages/profile/index.vue', /v-if="aiState\.enabled" class="menu-item"/],
    ['pages/self-service/index.vue', /v-if="aiState\.enabled" class="section ai-entry"/],
    ['pages/ai-chat/index.vue', /!aiState\.enabled/],
    ['pages/secretary/index.vue', /!aiState\.enabled/],
  ]

  for (const [file, pattern] of gated) {
    assert.match(read(file), pattern, file)
  }
})

test('关闭 AI 时会话页展示未开放空态且不发能力请求', () => {
  const chat = read('composables/useUserAiChat.ts')
  assert.match(chat, /aiDisabled\(\)/)

  for (const file of ['pages/ai-chat/index.vue', 'pages/secretary/index.vue']) {
    assert.match(read(file), /AI 功能暂未开放/, file)
  }
})
