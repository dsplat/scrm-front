/**
 * C端推广海报 API — 分享者即分销员
 *
 * distributor_id 由后端从登录身份推导（不接受传参），
 * 非分销员用户生成海报时自动开通分销身份。
 */
import { request } from '../utils/request'

export interface MyPoster {
  poster_id: number
  name: string
  category: string | null
  template_url: string | null
  preview_url: string | null
  campaign_id: number | null
  campaign?: { campaign_id: number; name: string } | null
}

export interface MyPosterRenderResult {
  poster: { poster_id: number; name: string }
  image_url: string
  qrcode_url: string
  cached: boolean
}

/** 可推广海报列表（仅已审核通过） */
export async function getMyPosters(): Promise<MyPoster[]> {
  return request({
    url: '/scrm/my/posters',
    method: 'GET',
  })
}

/** 生成我的专属推广海报（服务端渲染 PNG，二维码归因到我） */
export async function renderMyPoster(posterId: number): Promise<MyPosterRenderResult> {
  return request({
    url: `/scrm/my/posters/${posterId}/render`,
    method: 'POST',
  })
}
