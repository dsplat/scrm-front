/**
 * 小程序传输层测试（sse.ts 的 postStreamMP）
 *
 * 只 stub 平台 API（globalThis.uni.request / RequestTask.onChunkReceived），
 * 不 stub 解码与回调逻辑：测「分块到达 → 增量 UTF-8 解码 → onData/onDone/onError」的真实接缝。
 *
 * 运行：pnpm --filter @scrm/h5-ai test
 */
import { strict as assert } from 'node:assert'
import { postStreamMP } from '../src/sse.ts'

const enc = new TextEncoder()

interface StubRequest {
  url: string
  header: Record<string, string>
  data: string
  enableChunked: boolean
  aborts: number
  emit(chunk: Uint8Array): void
  finish(statusCode: number, data: string): void
  fail(): void
}

/** 每个用例装一台「假的 uni.request」，拿到回调入口后由用例决定怎么喂块 */
function installUni(options: { withChunkApi?: boolean } = {}) {
  let current: StubRequest | null = null
  ;(globalThis as any).uni = {
    request(init: any) {
      let chunkCb: ((r: { data: ArrayBuffer }) => void) | null = null
      const task: any = {
        abort() {
          current!.aborts += 1
        },
      }
      if (options.withChunkApi !== false) {
        // 低版本基础库没有该方法，postStreamMP 靠 typeof 判断降级
        task.onChunkReceived = (cb: (r: { data: ArrayBuffer }) => void) => {
          chunkCb = cb
        }
      }
      current = {
        url: init.url,
        header: init.header,
        data: init.data,
        enableChunked: !!init.enableChunked,
        aborts: 0,
        emit(chunk) {
          const copy = chunk.slice()
          chunkCb?.({ data: copy.buffer as ArrayBuffer })
        },
        finish(statusCode, data) {
          init.success({ statusCode, data })
        },
        fail() {
          init.fail()
        },
      }
      return task
    },
  }
  return () => current!
}

// ── 1. 正常流：多块到达（含跨块断开的汉字）+ success 收尾 ──
{
  const req = installUni()
  const chunks: string[] = []
  let done = 0
  let error: unknown = null

  postStreamMP({
    url: 'https://club.mtedu.com/ai-stream/chat',
    headers: { Authorization: 'Bearer t', 'X-Tenant-ID': '6381894042846382' },
    body: '{"scope":"user"}',
    onData: (c) => chunks.push(c),
    onDone: () => {
      done += 1
    },
    onError: (e) => {
      error = e
    },
  })

  const r = req()
  assert.equal(r.url, 'https://club.mtedu.com/ai-stream/chat')
  assert.equal(r.enableChunked, true, '必须开启分块接收')
  assert.equal(r.header['X-Tenant-ID'], '6381894042846382', '租户头须透传')
  assert.equal(r.data, '{"scope":"user"}')

  // 「你」被切成 1+2 字节到达，随后是一条完整文本帧
  const frame = enc.encode('0:"你好"\n')
  r.emit(frame.slice(0, 4))
  r.emit(frame.slice(4, 5))
  r.emit(frame.slice(5))
  r.finish(200, '')

  assert.equal(chunks.join(''), '0:"你好"\n', '跨块汉字不得出乱码')
  assert.equal(done, 1, 'onDone 只触发一次')
  assert.equal(error, null)
}

// ── 2. 低版本基础库：无 onChunkReceived，整包落在 success.data，按单块补发 ──
{
  const req = installUni({ withChunkApi: false })
  const chunks: string[] = []
  let done = 0

  postStreamMP({
    url: 'https://x/ai-stream/chat',
    headers: {},
    body: '{}',
    onData: (c) => chunks.push(c),
    onDone: () => {
      done += 1
    },
    onError: () => {},
  })

  req().finish(200, '0:"整包"\n')
  assert.deepEqual(chunks, ['0:"整包"\n'], '降级时仍须把整包交给解析层')
  assert.equal(done, 1)
}

// ── 3. 非 2xx：后端 JSON message 直呈，带 statusCode；不再触发 onDone ──
{
  const req = installUni()
  let err: any = null
  let done = 0
  postStreamMP({
    url: 'https://x/ai-stream/chat',
    headers: {},
    body: '{}',
    onData: () => {},
    onDone: () => {
      done += 1
    },
    onError: (e) => {
      err = e
    },
  })
  req().finish(401, '{"message":"请先登录后使用智能问答"}')
  assert.equal(err.statusCode, 401)
  assert.equal(err.message, '请先登录后使用智能问答')
  assert.equal(done, 0)
}

// 非 2xx 且响应体不是 JSON：保留兜底文案
{
  const req = installUni()
  let err: any = null
  postStreamMP({
    url: 'https://x/ai-stream/chat',
    headers: {},
    body: '{}',
    onData: () => {},
    onDone: () => {},
    onError: (e) => {
      err = e
    },
  })
  req().finish(502, '<html>bad gateway</html>')
  assert.equal(err.statusCode, 502)
  assert.equal(err.message, 'AI 助手暂时不可用，请稍后重试。')
}

// ── 4. 网络失败：走 onError 兜底文案 ──
{
  const req = installUni()
  let err: any = null
  postStreamMP({
    url: 'https://x/ai-stream/chat',
    headers: {},
    body: '{}',
    onData: () => {},
    onDone: () => {},
    onError: (e) => {
      err = e
    },
  })
  req().fail()
  assert.equal(err.message, 'AI 助手连接失败，请使用页面原有功能。')
}

// ── 5. abort：幂等，且中断后到达的块/结束回调一律忽略 ──
{
  const req = installUni()
  const chunks: string[] = []
  let done = 0
  let error: unknown = null
  const handle = postStreamMP({
    url: 'https://x/ai-stream/chat',
    headers: {},
    body: '{}',
    onData: (c) => chunks.push(c),
    onDone: () => {
      done += 1
    },
    onError: (e) => {
      error = e
    },
  })
  const r = req()
  r.emit(enc.encode('0:"前半"'))
  handle.abort()
  handle.abort()
  r.emit(enc.encode('0:"后半"'))
  r.finish(200, '')
  assert.equal(r.aborts, 1, 'abort 只下发一次')
  assert.equal(chunks.join(''), '0:"前半"', '中断后的块不得再落到 UI')
  assert.equal(done, 0)
  assert.equal(error, null, '主动中断不算错误')
}

console.log('mp-transport.test.ts ok')
