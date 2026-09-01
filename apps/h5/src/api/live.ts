import { request } from '../utils/request'

// ========== 类型 ==========

export interface LiveRoomSummary {
  room_id: number
  title: string
  cover: string | null
  status: 'scheduled' | 'living' | 'ended'
  scheduled_at: string | null
  replay_url: string | null
}

export interface LiveChatConfig {
  type: string
  channel_id?: number | string
  viewer_token?: string
  chat_url?: string
}

export interface LiveWatchResult {
  room_id: number
  title: string
  status: string
  provider: string
  play_url: string | null
  replay_url: string | null
  chat: LiveChatConfig | null
}

// ========== 直播 ==========

export function getLiveRooms(status?: string) {
  return request<LiveRoomSummary[]>({
    url: '/scrm/student/live-rooms',
    data: status ? { status } : undefined,
  })
}

export function watchLiveRoom(roomId: string | number) {
  return request<LiveWatchResult>({ url: `/scrm/student/live-rooms/${roomId}/watch` })
}

export function reportLiveView(roomId: string | number, durationSeconds: number) {
  return request<unknown>({
    url: `/scrm/student/live-rooms/${roomId}/view`,
    method: 'POST',
    data: { duration_seconds: durationSeconds },
  })
}
