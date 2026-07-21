/**
 * 用户状态管理（轻量级 reactive store）
 */
import { reactive, readonly } from 'vue'
import type { UserInfo } from '../api/auth'
import { getMe, logout as apiLogout } from '../api/auth'

interface UserState {
  user: UserInfo | null
  tenantId: number | null
  loading: boolean
}

const state = reactive<UserState>({
  user: null,
  tenantId: null,
  loading: false,
})

/**
 * 获取当前用户信息（从 API 拉取）
 */
async function fetchUser(): Promise<UserInfo | null> {
  state.loading = true
  try {
    const res = await getMe()
    state.user = res.user
    state.tenantId = res.tenant_id ?? null
    return res.user
  } catch {
    state.user = null
    state.tenantId = null
    return null
  } finally {
    state.loading = false
  }
}

/**
 * 设置用户信息（登录/注册成功后本地设置）
 */
function setUser(user: UserInfo, tenantId?: number) {
  state.user = user
  state.tenantId = tenantId ?? null
}

/**
 * 登出并清空状态
 */
async function logout() {
  await apiLogout()
  state.user = null
  state.tenantId = null
}

/**
 * 清空本地状态（不调 API，用于 token 失效场景）
 */
function clearUser() {
  state.user = null
  state.tenantId = null
}

export const useUserStore = () => ({
  state: readonly(state),
  fetchUser,
  setUser,
  logout,
  clearUser,
})
