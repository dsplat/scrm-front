import { strict as assert } from 'node:assert'
import { createUtf8StreamDecoder } from '../src/sse.ts'

const bytes = (...b: number[]) => new Uint8Array(b)

// ASCII 单块
{
  const decode = createUtf8StreamDecoder()
  assert.equal(decode(new TextEncoder().encode('0:"hi"\n')), '0:"hi"\n')
}

// 3 字节汉字被切在块边界（你 = E4 BD A0）：前两截不得输出乱码，第三截补齐后才出字
{
  const decode = createUtf8StreamDecoder()
  assert.equal(decode(bytes(0xe4)), '')
  assert.equal(decode(bytes(0xbd)), '')
  assert.equal(decode(bytes(0xa0)), '你')
}

// 汉字与后续 ASCII 同块：补齐后剩余字节继续解码
{
  const decode = createUtf8StreamDecoder()
  assert.equal(decode(bytes(0xe4, 0xbd)), '')
  assert.equal(decode(bytes(0xa0, 0x41)), '你A')
}

// 4 字节 emoji 跨块（😀 = F0 9F 98 80）：按代理对输出
{
  const decode = createUtf8StreamDecoder()
  assert.equal(decode(bytes(0xf0, 0x9f)), '')
  assert.equal(decode(bytes(0x98)), '')
  assert.equal(decode(bytes(0x80)), '😀')
}

// 真实帧跨块：一行 data stream 被切成三段到达，拼出完整行
{
  const decode = createUtf8StreamDecoder()
  const frame = new TextEncoder().encode('0:"错题讲解"\n')
  const parts = [frame.slice(0, 5), frame.slice(5, 7), frame.slice(7)]
  assert.equal(parts.map((p) => decode(p)).join(''), '0:"错题讲解"\n')
}

// 非法首字节（0x80 续字节裸奔）丢弃，不产生乱码也不卡住后续输出
{
  const decode = createUtf8StreamDecoder()
  assert.equal(decode(bytes(0x80, 0x41)), 'A')
}

console.log('utf8-stream.test.ts ok')
