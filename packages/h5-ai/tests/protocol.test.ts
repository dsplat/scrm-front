import { strict as assert } from 'node:assert'
import { parseDataStreamLine } from '../src/protocol.ts'

assert.deepEqual(parseDataStreamLine('0:"你好"'), { type: 'text', value: '你好' })
assert.equal(
  parseDataStreamLine('9:{"toolCallId":"t1","toolName":"knowledge_search","args":{"q":"x"}}').type,
  'tool_call',
)
assert.deepEqual(parseDataStreamLine('3:"限流"'), { type: 'error', value: '限流' })
assert.deepEqual(parseDataStreamLine('d:null'), { type: 'done', value: null })
assert.deepEqual(parseDataStreamLine('bad'), { type: 'ignore' })
assert.deepEqual(parseDataStreamLine('2:[{"type":"meta","conversation_id":123,"agent_id":9}]'), {
  type: 'meta',
  value: { type: 'meta', conversation_id: 123, agent_id: 9 },
})
assert.deepEqual(
  parseDataStreamLine(
    'a:{"toolCallId":"t1","result":{"action":"form_fill","fields":{"name":"A"}}}',
  ),
  { type: 'form_fill', value: { action: 'form_fill', fields: { name: 'A' } } },
)
assert.deepEqual(
  parseDataStreamLine(
    'a:{"toolCallId":"t1","result":{"action":"pending_confirmation","token":"x"}}',
  ),
  { type: 'pending_confirmation', value: { action: 'pending_confirmation', token: 'x' } },
)

// BL-059：e: finish_step（单步完成）应被解析并透传；仅记录，不参与授权/计费
assert.deepEqual(
  parseDataStreamLine(
    'e:{"finishReason":"tool-calls","usage":{"promptTokens":10,"completionTokens":5},"isContinued":true}',
  ),
  {
    type: 'step_finish',
    value: {
      finishReason: 'tool-calls',
      usage: { promptTokens: 10, completionTokens: 5 },
      isContinued: true,
    },
  },
)
// 载荷缺 finishReason / isContinued 仍透传（不得误判为 done 或被吞）
assert.deepEqual(parseDataStreamLine('e:{"usage":{"promptTokens":1}}'), {
  type: 'step_finish',
  value: { finishReason: undefined, usage: { promptTokens: 1 }, isContinued: undefined },
})
// 非法载荷（非对象 / 非法 JSON）→ ignore，不得误判为结束帧
assert.deepEqual(parseDataStreamLine('e:oops'), { type: 'ignore' })
assert.deepEqual(parseDataStreamLine('e:"str"'), { type: 'ignore' })
// f: start_step 属既有「不消费」面，行为不变
assert.deepEqual(parseDataStreamLine('f:{"messageId":"m1"}'), { type: 'ignore' })
