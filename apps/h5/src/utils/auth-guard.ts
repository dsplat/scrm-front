/**
 * 登录守卫 — 需登录操作前调用（报名/下单/打卡/观看直播等）
 *
 * - 已登录 → 返回 true，调用方继续原操作
 * - 未登录 → showModal（"该操作需登录后进行"）：确认跳登录页（带 redirect，登录后回原页），
 *   取消留在原页；返回 false 供调用方中断操作
 */
import { getToken, redirectToLogin } from './request'

export async function ensureLogin(message = '该操作需登录后进行'): Promise<boolean> {
  if (getToken()) return true
  return new Promise((resolve) => {
    uni.showModal({
      title: '需要登录',
      content: message,
      confirmText: '去登录',
      cancelText: '暂不登录',
      success: (res) => {
        if (res.confirm) {
          redirectToLogin()
        }
        resolve(false)
      },
      fail: () => resolve(false),
    })
  })
}
