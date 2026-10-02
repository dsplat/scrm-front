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
