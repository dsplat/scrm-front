/// <reference types="@dcloudio/uni-app" />
/**
 * 邀请码捕获（注册门禁 invite_only 模式）
 *
 * 邀请链接/海报二维码将邀请码编入 URL 的 invite_code 参数（hash 之前），
 * 结构如：{h5}/?invite_code=A2K9XYZ#/pages/auth/register
 * H5 启动时从 location.search 读取并持久化，进入注册页时自动回填，
 * 提交注册时随 emailRegister 上送，服务端消费并写入老带新归因。
 *
 * 与 utils/referral.ts（分销 ref）职责区分：referral 记录分销员 ID 用于计佣，
 * 本文件记录注册邀请码用于门禁 + 归因，两者可并存。
 */

const INVITE_KEY = 'scrm_invite_code'

/** 从当前 URL 提取 invite_code（兼容 hash 路由：位于 hash 之前） */
export function captureInviteCode(): void {
  // #ifdef H5
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite_code')
    if (code) {
      uni.setStorageSync(INVITE_KEY, code)
    }
  } catch (e) {
    // 静默失败：邀请码非关键路径，注册页仍可手动输入
  }
  // #endif
}

/** 读取已捕获的邀请码（未捕获返回空串） */
export function getStoredInviteCode(): string {
  return uni.getStorageSync(INVITE_KEY) || ''
}

/** 注册成功后清除，避免下次进入注册页误带旧码 */
export function clearInviteCode(): void {
  uni.removeStorageSync(INVITE_KEY)
}
