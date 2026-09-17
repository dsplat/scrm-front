/**
 * 品牌色派生工具
 *
 * 双端共用同一份实现，是刻意为之：
 * - 浏览器侧（H5）：store/tenant.ts 的 applyBranding 运行时按租户 branding 计算
 * - Node 侧（小程序构建）：vite.config.ts 在编译期算好写进 CSS 变量
 *
 * 小程序端没有 DOM，无法运行时 setProperty，主题色只能构建期静态注入；若两处
 * 各写一套算法，H5 与小程序会出现肉眼可见的色差。
 */

/** 兜底主色（微信绿），租户未配 branding.primary_color 时使用 */
export const BRAND_PRIMARY_FALLBACK = '#07c160'

/**
 * hex 转 rgba（软色背景用）
 *
 * 非法输入回退到兜底主色的 rgba，不抛错：品牌色来自租户配置，畸形值不该让
 * 首屏渲染或构建中断。
 */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(7,193,96,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`
}

/** 颜色加深（每通道按 ratio 混入黑色），用于渐变第二色 */
export function darken(hex: string, ratio = 0.1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const f = (v: number) => Math.round((v / 255) * (1 - ratio) * 255)
  const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * 由主色派生完整主题三元组
 *
 * 与 App.vue 里 CSS 变量一一对应，两端都经此函数产出，保证同名同值。
 */
export function deriveTheme(primary: string): {
  primary: string
  primaryDeep: string
  primarySoft: string
} {
  return {
    primary,
    primaryDeep: darken(primary),
    primarySoft: hexToRgba(primary, 0.08),
  }
}
