import { http } from '@scrm/shared'

export interface LoginParams {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: {
    id: number
    name: string
    email: string
  }
}

export async function login(params: LoginParams) {
  const res = await http.post<LoginResult>('/auth/login', params)
  return res.data
}

export async function logout() {
  await http.post('/auth/logout')
}

export async function getProfile() {
  const res = await http.get('/auth/me')
  return res.data
}

export async function getTenantFeatures() {
  const res = await http.get('/tenant/features')
  return res.data
}
