/**
 * user-core 类型定义（与框架 @dsplat/user-core 保持同步）
 *
 * 此文件为 scrm-platform-front 本地副本，
 * 后续可通过 npm 包或 git submodule 自动同步。
 */

export interface UserInfo {
  user_id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  email_verified_at?: string | null
  phone_verified_at?: string | null
  is_active?: boolean
}

export interface OAuthBinding {
  id: number
  provider: string
  provider_user_id: string
  nickname?: string
  avatar?: string
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: UserInfo
}

export interface MfaChallengeResponse {
  mfa_required: true
  user_id: number
  available_types: string[]
}

export type LoginResponse = AuthResponse | MfaChallengeResponse

export interface OAuthProvider {
  provider: string
  name: string
}

export interface LoginConfig {
  oauth_providers: OAuthProvider[]
  sso_providers: OAuthProvider[]
  allow_register: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface Notification {
  id: number
  type: string
  title: string
  content?: string
  read_at?: string | null
  created_at: string
}
