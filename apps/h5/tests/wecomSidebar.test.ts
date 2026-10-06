/**
 * 企微聊天侧边栏 JSSDK 封装单测（BL-011 第一切片）
 *
 * 运行：node --experimental-strip-types tests/wecomSidebar.test.ts
 *
 * 覆盖：
 *  - 契约映射：后端 {corp_id,agent_id,nonce_str} → 企微 agentConfig {corpid,agentid,nonceStr}
 *  - getCurExternalContact 回调 → external_userid 抽取（userId / 变体 / 失败）
 *  - sendChatMessage 消息体构造（文本 / 链接卡片）与失败分支
 *  - setupWecomSidebar：mock wx 下的签名取值、hash 剥离、agentConfig 幂等
 *
 * 与本仓其它包（packages/h5-ai/tests）同口径：node:assert + strip-types，不引导测试框架。
 */
import { strict as assert } from 'node:assert'
import {
  WECOM_SIDEBAR_JS_APIS,
  WecomSidebarError,
  buildAgentConfigPayload,
  buildLinkMessage,
  buildTextMessage,
  extractExternalUserId,
  getExternalUserId,
  isWecomBrowser,
  sendChatMessage,
  setupWecomSidebar,
  type WecomSignature,
} from '../src/utils/wecomSidebar.ts'

const WECOM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) MicroMessenger/7.0.1 wxwork/4.1.10'
const PLAIN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36'
const HREF = 'https://demo.example.com/h5/pages/wecom-sidebar/index#/pages/wecom-sidebar/index?x=1'

const sig: WecomSignature = {
  corp_id: 'ww1234567890',
  agent_id: 1000002,
  timestamp: 1700000000,
  nonce_str: 'nonce-abc',
  signature: 'sig-xyz',
}

/** 注入运行时全局（浏览器里 window 即 globalThis，此处等价模拟） */
function installGlobals(ua: string, href = HREF): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: ua },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'location', { value: { href }, configurable: true })
}

function setWx(wx: unknown): void {
  Object.defineProperty(globalThis, 'wx', { value: wx, configurable: true, writable: true })
}

const isReason = (reason: string) => (e: unknown) =>
  e instanceof WecomSidebarError && e.reason === reason

// ════ 一、契约映射：snake_case 后端契约 → 企微小写 corp/agent 字段 ════
{
  const payload = buildAgentConfigPayload(sig)
  assert.equal(payload.corpid, 'ww1234567890', 'corp_id 应映射为 corpid')
  assert.equal(payload.agentid, 1000002, 'agent_id 应映射为 agentid')
  assert.equal(payload.nonceStr, 'nonce-abc', 'nonce_str 应映射为 nonceStr')
  assert.equal(payload.timestamp, 1700000000)
  assert.equal(payload.signature, 'sig-xyz')
  assert.deepEqual(payload.jsApiList, WECOM_SIDEBAR_JS_APIS, '默认给齐侧边栏接口')

  const custom = buildAgentConfigPayload(sig, ['getContext'])
  assert.deepEqual(custom.jsApiList, ['getContext'])
  // 返回值必须是拷贝，调用方改动不污染内部常量
  custom.jsApiList.push('x')
  assert.deepEqual(WECOM_SIDEBAR_JS_APIS.includes('x'), false)
}

// ════ 二、签名校验：缺字段 / 空接口列表 → signature 错误 ════
{
  assert.throws(() => buildAgentConfigPayload({ ...sig, signature: '' }), isReason('signature'))
  assert.throws(() => buildAgentConfigPayload({ ...sig, corp_id: '' }), isReason('signature'))
  assert.throws(() => buildAgentConfigPayload(sig, []), isReason('signature'))
}

// ════ 三、getCurExternalContact 回调 → external_userid 抽取 ════
{
  assert.equal(extractExternalUserId({ userId: 'wm_abc123' }), 'wm_abc123')
  // 兼容后端字段名变体
  assert.equal(extractExternalUserId({ external_userid: 'wm_def456' }), 'wm_def456')
  assert.throws(() => extractExternalUserId({}), isReason('sdk_error'))
  assert.throws(() => extractExternalUserId(undefined), isReason('sdk_error'))
  assert.throws(
    () => extractExternalUserId({ errMsg: 'getCurExternalContact:fail no permission' }),
    isReason('sdk_error'),
  )
}

// ════ 四、消息体构造（话术文本 / 素材&活动链接卡片） ════
{
  assert.deepEqual(buildTextMessage('  你好  '), { msgtype: 'text', text: { content: '你好' } })
  assert.throws(() => buildTextMessage('   '), isReason('sdk_error'))

  assert.deepEqual(buildLinkMessage({ url: 'https://a/b' }), {
    msgtype: 'link',
    link: { title: '', desc: '', url: 'https://a/b', imgUrl: '' },
  })
  assert.deepEqual(
    buildLinkMessage({ url: 'https://a/b', title: 'T', desc: 'D', imgUrl: 'https://a/i.png' }),
    {
      msgtype: 'link',
      link: { title: 'T', desc: 'D', url: 'https://a/b', imgUrl: 'https://a/i.png' },
    },
  )
  assert.throws(() => buildLinkMessage({ url: '' }), isReason('sdk_error'))
}

// ════ 五、环境判定：UA 含 wxwork 才算企微 ════
{
  installGlobals(WECOM_UA)
  assert.equal(isWecomBrowser(), true)
  installGlobals(PLAIN_UA)
  assert.equal(isWecomBrowser(), false)
}

// ════ 六、setupWecomSidebar：签名取值 / hash 剥离 / agentConfig 幂等 ════
{
  installGlobals(WECOM_UA)
  let agentConfigCalls = 0
  let captured: Record<string, unknown> | null = null
  setWx({
    agentConfig(conf: Record<string, unknown>) {
      agentConfigCalls += 1
      captured = conf
      ;(conf.success as () => void)?.()
    },
    invoke() {},
    error() {},
  })

  const urls: string[] = []
  const provider = async (url: string) => {
    urls.push(url)
    return sig
  }

  await setupWecomSidebar({ getSignature: provider })
  await setupWecomSidebar({ getSignature: provider })

  assert.equal(agentConfigCalls, 1, 'agentConfig 一个页面只应调用一次（幂等）')
  assert.equal(urls.length, 1, '签名只应取一次')
  assert.equal(urls[0], 'https://demo.example.com/h5/pages/wecom-sidebar/index', '# 及后段应剥离')
  assert.equal(captured?.corpid, 'ww1234567890')
  assert.equal(captured?.agentid, 1000002)
  assert.equal(captured?.nonceStr, 'nonce-abc')
  assert.deepEqual(captured?.jsApiList, WECOM_SIDEBAR_JS_APIS)
}

// ════ 七、非企微环境：setup 抛 unsupported，不进入签名流程 ════
{
  installGlobals(PLAIN_UA)
  let called = false
  await assert.rejects(
    () =>
      setupWecomSidebar({
        getSignature: async () => {
          called = true
          return sig
        },
      }),
    isReason('unsupported'),
  )
  assert.equal(called, false, 'unsupported 时不应触发签名请求')
}

// ════ 八、wx.invoke：getCurExternalContact / sendChatMessage 成功与失败 ════
{
  installGlobals(WECOM_UA)
  const calls: Array<{ api: string; params: Record<string, unknown> }> = []
  setWx({
    agentConfig() {},
    invoke(api: string, params: Record<string, unknown>, cb: (res: unknown) => void) {
      calls.push({ api, params })
      cb({ errMsg: `${api}:ok`, userId: 'wm_xyz' })
    },
    error() {},
  })

  const uid = await getExternalUserId()
  assert.equal(uid, 'wm_xyz')
  assert.equal(calls[0].api, 'getCurExternalContact')

  await sendChatMessage(buildTextMessage('你好'))
  assert.equal(calls[1].api, 'sendChatMessage')
  assert.deepEqual(calls[1].params, { msgtype: 'text', text: { content: '你好' } })

  // 失败分支：errMsg 含 :fail 应 reject 为 sdk_error
  setWx({
    agentConfig() {},
    invoke(api: string, _params: Record<string, unknown>, cb: (res: unknown) => void) {
      cb({ errMsg: `${api}:fail no permission` })
    },
    error() {},
  })
  await assert.rejects(() => sendChatMessage(buildTextMessage('x')), isReason('sdk_error'))
}

// ════ 九、未初始化（无 wx）：invoke 抛 sdk_load ════
{
  setWx(undefined)
  await assert.rejects(() => getExternalUserId(), isReason('sdk_load'))
}

console.log('wecomSidebar tests passed')
