import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@scrm/shared'

interface User {
  user_id: number
  name: string
  email: string
  role?: string
}

interface LoginResponse {
  success: boolean
  data: {
    auth_token: string
    user: User
    tenant_id: number | null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('scrm_token'))
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await http.post<LoginResponse>('/auth/login', {
      email,
      password,
    })

    const { auth_token, user: userData } = (res as any).data
    token.value = auth_token
    user.value = userData
    localStorage.setItem('scrm_token', auth_token)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('scrm_token')
    window.location.href = '/scrm-console/login'
  }

  async function fetchProfile() {
    try {
      const res = await http.get<{ user: User; tenant_id: number | null }>('/auth/me')
      user.value = (res as any).data?.user ?? (res as any).user ?? null
    } catch (err: any) {
      // 仅当 token 确实失效时才清除登录态
      if (err?.response?.status === 401) {
        logout()
      }
    }
  }

  function getAuthHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { token, user, isAuthenticated, login, logout, fetchProfile, getAuthHeaders }
})
