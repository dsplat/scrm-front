import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildMessages, buildUserAiStreamBody } from '../src/api/user-ai-stream-body.ts'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(appRoot, 'src')
const read = (path: string) => readFileSync(join(srcRoot, path), 'utf8')

test('无会话 id 时保持前端历史上行（BC）', () => {
  const body = buildUserAiStreamBody({
    question: '第三轮',
    history: [
      { role: 'user', content: '第一轮' },
      { role: 'assistant', content: '回答一' },
      { role: 'assistant', content: '失败占位', isError: true },
      { role: 'assistant', content: '流式占位', streaming: true },
      { role: 'user', content: '第二轮' },
      { role: 'assistant', content: '回答二' },
    ],
    source: 'h5',
  })

  assert.equal(body.source, 'h5')
  assert.equal('conversation_id' in body, false, '无会话 id 时不得下发 conversation_id')
  assert.deepEqual(body.messages, [
    { role: 'user', content: '第一轮' },
    { role: 'assistant', content: '回答一' },
    { role: 'user', content: '第二轮' },
    { role: 'assistant', content: '回答二' },
    { role: 'user', content: '第三轮' },
  ])
})

test('有会话 id 时只上行本轮这一条，并回传 conversation_id', () => {
  const body = buildUserAiStreamBody({
    question: '第二轮',
    history: [
      { role: 'user', content: '第一轮' },
      { role: 'assistant', content: '回答一' },
    ],
    conversationId: 123,
    source: 'h5',
  })

  assert.equal(body.conversation_id, 123)
  assert.deepEqual(body.messages, [{ role: 'user', content: '第二轮' }])
})

test('非法/过期会话 id 视为新会话，仍走上行历史', () => {
  for (const conversationId of [null, 0, -1, Number.NaN]) {
    const body = buildUserAiStreamBody({
      question: '本轮',
      history: [{ role: 'user', content: '上一轮' }],
      conversationId,
      source: 'miniapp',
    })
    assert.equal(body.source, 'miniapp')
    assert.equal('conversation_id' in body, false)
    assert.deepEqual(body.messages, [
      { role: 'user', content: '上一轮' },
      { role: 'user', content: '本轮' },
    ])
  }
})

test('历史裁剪保留本轮问题且不超过上限', () => {
  const history = Array.from({ length: 30 }, (_, index) => ({
    role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `历史-${index}`,
  }))
  const messages = buildMessages('本轮', history, 4)
  assert.equal(messages.length, 5)
  assert.deepEqual(messages.at(-1), { role: 'user', content: '本轮' })
})

test('流式链路已接线 conversation_id / source / onMeta', () => {
  const api = read('api/user-ai.ts')
  const body = read('api/user-ai-stream-body.ts')
  assert.match(api, /conversationId\?: number \| null/)
  assert.match(api, /source\?: 'h5' \| 'miniapp'/)
  assert.match(
    api,
    /onMeta\?: \(meta: \{ conversation_id\?: number; agent_id\?: number \}\) => void/,
  )
  assert.match(api, /event\.type === 'meta'/)
  assert.match(api, /opts\.onMeta\?\.\(meta\)/)
  assert.match(api, /buildUserAiStreamBody\(/)
  assert.match(body, /conversation_id\?: number/)
  assert.match(
    body,
    /messages: conversationId\s*\?\s*\[\{ role: 'user', content: input\.question \}\]/,
  )
})

test('会话 id 按租户持久化，新对话清空', () => {
  const source = read('composables/useUserAiChat.ts')
  assert.match(source, /secretary_conversation_id:/)
  assert.match(source, /conversationId = ref<number \| null>\(readStoredConversationId\(\)\)/)
  assert.match(source, /uni\.removeStorageSync\(conversationStorageKey\(\)\)/)
  assert.match(source, /conversationId\.value = null/)
})

test('工作台页已注册且使用 optional 接口与真实兜底', () => {
  const manifest = JSON.parse(read('pages.json')) as { pages: Array<{ path: string }> }
  assert.ok(manifest.pages.some((page) => page.path === 'pages/secretary/index'))

  const api = read('api/workbench.ts')
  assert.match(api, /url: '\/biz\/workbench'/)
  assert.match(api, /auth: 'optional'/)
  assert.match(api, /fallback: true/)
  assert.match(api, /packs: \[\]/)
  assert.doesNotMatch(api, /fetch\(/)

  const page = read('pages/secretary/index.vue')
  assert.match(page, /ensureLogin\('使用小秘书需先登录'\)/)
  assert.match(page, /<ErrorState/)
  assert.match(page, /getWorkbench\(\)/)
  assert.match(page, /handoff\.mode !== 'message'/)
  assert.match(page, /encodeURIComponent\(text\)/)
})

test('悬浮球挂在 8 个约定页面，避开 chat/secretary/auth/self-service', () => {
  const mounted: Array<[string, 'true' | 'false', boolean]> = [
    ['pages/index/index.vue', 'true', false],
    ['pages/campaign/index.vue', 'true', false],
    ['pages/profile/index.vue', 'true', false],
    ['pages/course/detail.vue', 'false', true],
    ['pages/shop/detail.vue', 'false', true],
    ['pages/event/detail.vue', 'false', true],
    ['pages/my/orders.vue', 'false', false],
    ['pages/member/index.vue', 'false', false],
  ]
  for (const [file, tab, aboveBar] of mounted) {
    const expected = aboveBar
      ? `<SecretaryFab :tab-page="${tab}" :above-bottom-bar="true" />`
      : `<SecretaryFab :tab-page="${tab}" />`
    assert.ok(read(file).includes(expected), `${file}: ${expected}`)
  }
  for (const file of [
    'pages/ai-chat/index.vue',
    'pages/secretary/index.vue',
    'pages/self-service/index.vue',
    'pages/auth/login.vue',
    'pages/auth/register.vue',
  ]) {
    assert.doesNotMatch(read(file), /<SecretaryFab/, file)
  }
})

test('悬浮球位置/关闭期符合约定', () => {
  const fab = read('components/SecretaryFab.vue')
  assert.match(fab, /bottom: calc\(120rpx \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(fab, /bottom: calc\(32rpx \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(fab, /bottom: calc\(160rpx \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(fab, /7 \* 24 \* 60 \* 60 \* 1000/)
  assert.match(fab, /secretary_fab_dismissed_until/)
  assert.match(fab, /'\/pages\/secretary\/index'/)
})

test('会话页：q 自动发送、标题跟随后端、人工入口保留', () => {
  const page = read('pages/ai-chat/index.vue')
  assert.match(page, /onLoad\(\(query\) => \{/)
  assert.match(page, /pendingQuestion\.value/)
  assert.match(page, /autoSent\.value/)
  assert.match(page, /await send\(question\)/)
  assert.match(page, /quickQuestions/)
  assert.match(page, /handoffMessage/)
  assert.match(page, /startNewChat/)
})

test('客服/我的入口改到工作台', () => {
  const selfService = read('pages/self-service/index.vue')
  assert.match(selfService, /openSecretary/)
  assert.match(selfService, /'\/pages\/secretary\/index'/)
  assert.doesNotMatch(selfService, /'\/pages\/ai-chat\/index'/)

  const profile = read('pages/profile/index.vue')
  assert.match(profile, /我的小秘书/)
  assert.match(profile, /goSecretary/)
  assert.match(profile, /'\/pages\/secretary\/index'/)
})
