import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@scrm/shared'

interface User {
  id: number
  name: string
  email: string
}

interface LoginResponse {
  success: boolean
  data: {
    token: string
    user: User
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

    const { token: newToken, user: userData } = (res.data as any).data
    token.value = newToken
    user.value = userData
    localStorage.setItem('scrm_token', newToken)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('scrm_token')
    window.location.href = '/scrm-console/login'
  }

  async function fetchProfile() {
    try {
      const res = await http.get('/auth/me')
      user.value = res.data as any
    } catch {
      // Token might be invalid
      logout()
    }
  }

  function getAuthHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { token, user, isAuthenticated, login, logout, fetchProfile, getAuthHeaders }
})
