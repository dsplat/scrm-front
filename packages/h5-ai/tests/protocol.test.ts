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
