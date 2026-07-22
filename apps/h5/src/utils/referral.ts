/// <reference types="@dcloudio/uni-app" />
/**
 * 分销归因参数捕获
 *
 * 海报/邀请链接二维码将分销员 ID 编入 URL 的 ref 参数（hash 之前），
 * 结构如：{h5}/?ref=123#/pages/event/detail?eventId=1
 * H5 启动时从 location.search 读取并持久化，登录后调用归因绑定接口，
 * 建立客户-分销员归属关系，使后续下单触发上级链计佣。
 */

const REF_KEY = 'scrm_ref'

/** 从当前 URL 提取 ref（兼容 hash 路由：ref 位于 hash 之前） */
export function captureReferral(): void {
  // #ifdef H5
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      uni.setStorageSync(REF_KEY, ref)
    }
  } catch (e) {
    // 静默失败：归因非关键路径，不阻断用户浏览
  }
  // #endif
}

/** 读取已捕获的分销员 ID（未捕获返回 null） */
export function getStoredRef(): string | null {
  return uni.getStorageSync(REF_KEY) || null
}

/** 绑定成功后清除，避免重复绑定 */
export function clearReferral(): void {
  uni.removeStorageSync(REF_KEY)
}
