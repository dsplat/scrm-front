/**
 * C 端 AI 可用性（租户级总开关）
 *
 * 事实源是工作台接口的 `ai_enabled`：后台关闭后框架在 API 层统一 403，
 * 这里只负责让入口先行消失，避免用户点了才发现不可用。
 *
 * 请求失败（内置兜底 fallback）时保持可用：网络抖动不该把功能藏起来，
 * 真不可用时页面自身的错误态仍有兜底。
 */
import { reactive, readonly } from 'vue'
import { getWorkbench } from '../api/workbench'

interface AiAvailabilityState {
  loaded: boolean
  enabled: boolean
}

const state = reactive<AiAvailabilityState>({ loaded: false, enabled: true })
let pending: Promise<void> | null = null

/** 同步判定：已读到开关且明确关闭（未就绪时按可用处理） */
export function aiDisabled(): boolean {
  return state.loaded && !state.enabled
}

/** 页面已自行取到工作台数据时直接回填，避免重复请求 */
export function applyAiEnabled(enabled: boolean): void {
  state.enabled = enabled
  state.loaded = true
}

/** 确保已读取开关；同一会话只请求一次，多页面共享结果 */
export function ensureAiAvailability(): Promise<void> {
  if (state.loaded) return Promise.resolve()
  if (pending) return pending

  pending = getWorkbench()
    .then((workbench) => {
      if (!workbench.fallback) applyAiEnabled(workbench.ai_enabled)
      else state.loaded = true
    })
    .finally(() => {
      pending = null
    })

  return pending
}

export function useAiAvailability() {
  return { state: readonly(state), ensureAiAvailability, applyAiEnabled }
}
