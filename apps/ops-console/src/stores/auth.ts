import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@scrm/shared'
import type { AxiosResponse } from 'axios'

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
    const res: AxiosResponse<LoginResponse> = await http.post('/auth/login', {
      email,
      password,
    })

    const { token: newToken, user: userData } = res.data.data
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
      user.value = res.data?.data ?? res.data
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
