/**
 * 流式「消费链路」测试（R-28）
 *
 * 与 protocol.test.ts 的分工：那份只断言 `parseDataStreamLine` 的解析结果（单点），
 * 本份覆盖解析之后的分派与落地——帧语义 → dispatchDataStreamLine → assistantStore / 页面回调，
 * 以及经真实 `useAssistantStream` + `sse.ts` 传输适配层（stub fetch）的端到端一轮。
 *
 * 只 stub 网络（globalThis.fetch），不 stub 解析/分派/store：测的是产品真实接缝。
 * 运行：pnpm --filter @scrm/h5-ai test
 */
import { strict as assert } from 'node:assert'
import { dispatchDataStreamLine, type StreamLineHandlers } from '../src/protocol.ts'
import { assistantStore } from '../src/store.ts'
import { useAssistantStream } from '../src/composables/useAssistantStream.ts'

const enc = new TextEncoder()

// ════ 一、dispatchDataStreamLine：帧 → 回调的分派语义 ════
{
  const seen: Array<[string, unknown]> = []
  const h: StreamLineHandlers = {
    onText: (t) => seen.push(['text', t]),
    onMeta: (m) => seen.push(['meta', m]),
    onToolCall: (c) => seen.push(['tool_call', c]),
    onToolResult: (id, r) => seen.push(['tool_result', { id, r }]),
    onFormFill: (v) => seen.push(['form_fill', v]),
    onWorkflow: (v) => seen.push(['workflow', v]),
    onPendingConfirmation: (v) => seen.push(['pending_confirmation', v]),
    onUserChoice: (v) => seen.push(['user_choice', v]),
    onError: (m) => seen.push(['error', m]),
    onDone: (m) => seen.push(['done', m]),
  }

  assert.equal(dispatchDataStreamLine('0:"你好"', h), false, '文本帧不应结束')
  assert.equal(dispatchDataStreamLine('2:[{"type":"meta","conversation_id":7}]', h), false)
  assert.equal(
    dispatchDataStreamLine('9:{"toolCallId":"t1","toolName":"knowledge_search"}', h),
    false,
  )
  assert.equal(dispatchDataStreamLine('a:{"toolCallId":"t1","result":{"hits":2}}', h), false)
  // 四类控制消息必须各走各的回调，不得混入 tool_result
  assert.equal(
    dispatchDataStreamLine('a:{"toolCallId":"t2","result":{"action":"form_fill"}}', h),
    false,
  )
  assert.equal(
    dispatchDataStreamLine('a:{"toolCallId":"t3","result":{"action":"workflow"}}', h),
    false,
  )
  assert.equal(
    dispatchDataStreamLine('a:{"toolCallId":"t4","result":{"action":"pending_confirmation"}}', h),
    false,
  )
  assert.equal(
    dispatchDataStreamLine('a:{"toolCallId":"t5","result":{"action":"user_choice"}}', h),
    false,
  )
  assert.equal(dispatchDataStreamLine('3:"限流"', h), false)
  assert.equal(dispatchDataStreamLine('d:{"finishReason":"stop"}', h), true, 'd: 应告知上层终止')
  dispatchDataStreamLine('乱码不接', h)
  dispatchDataStreamLine('2:[{"type":"ping"}]', h)

  assert.deepEqual(
    seen.map((x) => x[0]),
    [
      'text',
      'meta',
      'tool_call',
      'tool_result',
      'form_fill',
      'workflow',
      'pending_confirmation',
      'user_choice',
      'error',
      'done',
    ],
    '每类帧应命中且仅命中一个回调（无动作的 ping / 乱码不得产生回调）',
  )
  assert.deepEqual(seen[1][1], { conversation_id: 7, agent_id: null })
  assert.deepEqual(seen[3][1], { id: 't1', r: { hits: 2 } })
}

// ════ 一b、e: finish_step（BL-059）：命中 onStepFinish，且不结束流；无该项回调时静默忽略 ════
{
  const steps: unknown[] = []
  const h: StreamLineHandlers = { onStepFinish: (info) => steps.push(info) }
  assert.equal(
    dispatchDataStreamLine('e:{"finishReason":"tool-calls","usage":{"promptTokens":10}}', h),
    false,
    'e: 不应被当作结束帧',
  )
  assert.deepEqual(steps, [
    { finishReason: 'tool-calls', usage: { promptTokens: 10 }, isContinued: undefined },
  ])
  // 向后兼容：旧分派器未挂 onStepFinish 时，e: 静默忽略（不外溢、不报错）
  assert.equal(dispatchDataStreamLine('e:{"finishReason":"stop"}', {}), false)
}

// ════ 二、回调异常隔离：UI bug 不得中断传输，也不得被转写成「连接失败」 ════
{
  const errors: Array<{ err: unknown; name: string }> = []
  let textAfter = ''
  const h: StreamLineHandlers = {
    onText: () => {
      throw new TypeError('渲染崩了')
    },
    onError: (m) => {
      textAfter = m
    },
    onDone: () => {
      textAfter += '|done'
    },
    onCallbackError: (err, name) => errors.push({ err, name }),
  }
  dispatchDataStreamLine('0:"x"', h)
  // 后续帧仍应被处理（一个回调的异常不外溢为流失败）
  assert.equal(dispatchDataStreamLine('d:{}', h), true)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].name, 'onText')
  assert.equal((errors[0].err as Error).message, '渲染崩了', '应保留原始异常，不被吞')
  assert.equal(textAfter, '|done', '后续帧仍应落地')
}

// ════ 三、端到端：真实 useAssistantStream + 真实 sse 适配层（stub fetch）→ store ════
let lastBody = ''
function stubFetch(lines: string[], ok = true, status = 200, json: unknown = null): void {
  ;(globalThis as any).fetch = async (_url: string, init: any) => {
    lastBody = init.body
    let i = 0
    return {
      ok,
      status,
      json: async () => json,
      body: {
        getReader: () => ({
          read: async () =>
            i < lines.length
              ? { done: false, value: enc.encode(lines[i++]) }
              : { done: true, value: undefined },
        }),
      },
    }
  }
}

{
  assistantStore.reset()
  // meta 帧落在两块里，同时测半行缓冲；末帧无换行测 EOF 冲刷
  stubFetch([
    '2:[{"type":"meta","conversation_id":123,"agent_id":9}]\n0:"好的',
    '"\n9:{"toolCallId":"t1","toolName":"knowledge_search"}\na:{"toolCallId":"t1","result":{"hits":1}}\n',
    'a:{"toolCallId":"t2","result":{"action":"form_fill","fields":{"name":"A"}}}\nd:{"finishReason":"stop"}',
  ])
  await useAssistantStream().send({ route: '/app/courses', module: 'courses' }, '帮我填表')

  const msgs = assistantStore.messages.value as any[]
  const answer = msgs.find((m) => m.role === 'assistant' && !m.isError)
  assert.equal(answer.content, '好的', '跨块文本应拼回')
  assert.equal(answer.streaming, false, 'd: 后应结束流式')
  assert.deepEqual(
    answer.toolCalls?.map((t: any) => [t.id, t.status]),
    [['t1', 'done']],
    '9: + a: 应落为一个已完成的工具调用',
  )
  assert.deepEqual(answer.formFill, { action: 'form_fill', fields: { name: 'A' } })
  assert.equal(assistantStore.conversationId.value, 123)
  assert.equal(assistantStore.agentId.value, 9, 'meta 的 agent_id 应进 store（供下轮回退）')
  assert.equal(assistantStore.streaming.value, false)
}

// R2b：页面未显式传 agent_id 时，请求体应回退到 store 里的上一轮归属
{
  stubFetch(['0:"第二轮"\n', 'd:{}\n'])
  await useAssistantStream().send({ route: '/app/courses', module: 'courses' }, '继续')
  const body = JSON.parse(lastBody)
  assert.equal(body.agent_id, 9, '应回退到上一轮 meta 的 agent_id，而非退化成无归属新会话')
  assert.equal(body.conversation_id, 123)
  assert.equal(body.messages.at(-1).role, 'user')
}

// ════ 三b、端到端：e: 帧写 store.lastStepFinish 最小状态，且不断流 ════
{
  assistantStore.reset()
  stubFetch([
    '0:"在跑"\n',
    'e:{"finishReason":"tool-calls","usage":{"promptTokens":10,"completionTokens":2},"isContinued":true}\n',
    '9:{"toolCallId":"t1","toolName":"knowledge_search"}\n',
    'e:{"finishReason":"stop","usage":{"promptTokens":12,"completionTokens":8}}\n',
    'd:{"finishReason":"stop"}\n',
  ])
  await useAssistantStream().send({ route: '/x', module: 'x' }, '多步链')

  assert.deepEqual(
    assistantStore.lastStepFinish.value,
    {
      finishReason: 'stop',
      usage: { promptTokens: 12, completionTokens: 8 },
      isContinued: undefined,
    },
    'e: 应写入 store 最小状态（末次覆盖为收尾步）',
  )
  const answer = (assistantStore.messages.value as any[]).find(
    (m) => m.role === 'assistant' && !m.isError,
  )
  assert.deepEqual(
    answer.toolCalls?.map((t: any) => t.id),
    ['t1'],
    'e: 不得被当成结束帧（其后 9:/d: 仍应被消费）',
  )
  assert.equal(assistantStore.streaming.value, false)
}

// ════ 三c、端到端：页面级 overrides 可挂接 onStepFinish（替换默认 store 写入） ════
{
  assistantStore.reset()
  const captured: unknown[] = []
  stubFetch(['e:{"finishReason":"tool-calls"}\n', 'd:{}\n'])
  await useAssistantStream().send({ route: '/x', module: 'x' }, '覆盖', {
    onStepFinish: (info) => captured.push(info),
  })
  assert.deepEqual(captured, [
    { finishReason: 'tool-calls', usage: undefined, isContinued: undefined },
  ])
  assert.equal(assistantStore.streaming.value, false, 'overrides 不应影响流收尾')
}

// R13b：UI 回调异常只报「渲染异常」一次，不得被转写成「AI 助手连接失败」
{
  assistantStore.reset()
  const logged: unknown[] = []
  const original = console.error
  console.error = (...args: unknown[]) => logged.push(args)
  stubFetch(['0:"半句"\n', 'a:{"toolCallId":"t1","result":{"action":"form_fill"}}\n', 'd:{}\n'])
  await useAssistantStream().send({ route: '/x', module: 'x' }, '触发渲染异常', {
    onFormFill: () => {
      throw new TypeError('卡片渲染崩了')
    },
  })
  console.error = original

  const msgs = assistantStore.messages.value as any[]
  const err = msgs.find((m) => m.isError)
  assert.ok(err, '回调异常应给出一条用户可见的降级提示')
  assert.equal(err.content, '界面渲染异常，回答可能不完整，请重新提问。')
  assert.equal(String(err.content).includes('连接失败'), false, '不得把 UI 异常伪装成传输故障')
  assert.equal(logged.length, 1, '真因只写日志一次')
  assert.match(String((logged[0] as any[])[1]), /卡片渲染崩了/)
  assert.equal(assistantStore.streaming.value, false, '异常不应让流状态卡死')
}

// 服务端 3: 帧的限流文案应原样透出（不是笼统「连接失败」），并结束本轮
{
  assistantStore.reset()
  stubFetch(['0:"没说完"\n', '3:"请求过于频繁，请稍后再试"\n'])
  await useAssistantStream().send({ route: '/x', module: 'x' }, '再问')
  const err = (assistantStore.messages.value as any[]).find((m) => m.isError)
  assert.equal(err.content, '请求过于频繁，请稍后再试')
  assert.equal(assistantStore.streaming.value, false)
}

// HTTP 非 2xx：由后端 message 决定文案，无 message 时退回状态码语义
{
  assistantStore.reset()
  stubFetch([], false, 429, { message: '请求过于频繁，请稍后重试' })
  await useAssistantStream().send({ route: '/x', module: 'x' }, '问')
  const err = (assistantStore.messages.value as any[]).find((m) => m.isError)
  assert.equal(err.content, '请求过于频繁，请稍后重试')
}

console.log('stream-consumption: ok')
