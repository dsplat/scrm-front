/// <reference types="@dcloudio/types" />
/**
 * useAvailability — H5 助手可用性探测
 *
 * 复用后端 GET /ai/assistant/availability（平台级秘书开关），User token 亦可访问
 * （VerifyOperatorTenant 对非 Operator 放行；该端点只读 config('ai.secretary.enabled')）。
 *
 * 说明：租户级 User 工具门 mcp_user 由服务端 effectiveTools 的 audience 过滤 fail-closed
 * 兜底（未开通则不下发任何工具，助手仍可纯文本对话）；前端「是否显示 AI 入口」以本探测
 * + 是否登录为准，工具级细节不在此判（属 BL-030b/c 的入口策展层）。
 *
 * 铁律：异步不阻塞首屏；探测失败视为可用（fail-open，秘书兜底）；结果缓存。
 */
import { getAIConfig } from '../config'
import { requestJSON } from '../request'
import { assistantStore } from '../store'

/** 探测结果缓存（全局一份，availability 不随页面变化） */
let cached: boolean | null = null

export function useAvailability() {
  async function check(): Promise<boolean> {
    if (cached !== null) {
      assistantStore.setAvailability(cached)
      return cached
    }

    const res = await requestJSON(endpointPath())
    const ok = res && res.success ? Boolean(res.data?.available) : true
    cached = ok
    assistantStore.setAvailability(ok)
    return ok
  }

  function invalidate(): void {
    cached = null
  }

  return { check, invalidate }
}

/** 从配置的完整 availabilityEndpoint 中截出相对 apiBase 的 path（requestJSON 会再拼 apiBase） */
function endpointPath(): string {
  const full = getAIConfig().availabilityEndpoint
  const base = getAIConfig().apiBase
  if (base && full.startsWith(base)) return full.slice(base.length) || '/'
  return full
}
