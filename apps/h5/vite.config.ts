import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { deriveTheme, BRAND_PRIMARY_FALLBACK } from './src/utils/color'

/**
 * 品牌主色（构建期注入）
 *
 * 小程序按租户单独构建，品牌色在构建期即确定，由 MiniappBuildService 经
 * VITE_BRAND_PRIMARY 传入（与 VITE_API_BASE 同一注入点）；H5 多租户共用一份产物，
 * 构建期不注入，运行时由 store/tenant.ts 的 applyBranding 按租户 branding 覆盖，
 * 故此值对 H5 无副作用（占位符所在的 #ifndef H5 块会被条件编译移除）。
 *
 * 严格校验 #RRGGBB：该值源自租户 branding 配置（数据库），畸形值一律回退兜底绿，
 * 避免把非法色值拼进产物。
 */
const rawBrand = process.env.VITE_BRAND_PRIMARY ?? ''
const BRAND_PRIMARY = /^#[0-9a-fA-F]{6}$/.test(rawBrand.trim())
  ? rawBrand.trim()
  : BRAND_PRIMARY_FALLBACK

/**
 * 小程序主题色编译期注入
 *
 * App.vue 的 #ifndef H5 块里写了 __SCRM_*__ 占位符。小程序无 DOM，主题色只能构建
 * 期定死；这里在 uni 条件编译前（enforce:'pre'）用真实色值替换占位符，色值经
 * utils/color.ts 的 deriveTheme 算出，与 H5 运行时 applyBranding 同源同算法，双端
 * 不会有色差。零依赖：不引 sass，纯字符串替换。
 *
 * 只命中 App.vue 原始 SFC（pre 阶段 id 以 App.vue 结尾、无 query）；替换发生在 vue
 * 插件拆分 style 子模块之前，故子模块继承已替换内容。先替换更长的 DEEP/SOFT 再替换
 * PRIMARY，避免前缀误伤。
 */
function scrmBrandTheme(): Plugin {
  const theme = deriveTheme(BRAND_PRIMARY)

  return {
    name: 'scrm-brand-theme',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('App.vue') || !code.includes('__SCRM_PRIMARY')) {
        return null
      }

      return {
        code: code
          .replace(/__SCRM_PRIMARY_DEEP__/g, theme.primaryDeep)
          .replace(/__SCRM_PRIMARY_SOFT__/g, theme.primarySoft)
          .replace(/__SCRM_PRIMARY__/g, theme.primary),
        map: null,
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/h5/',
  plugins: [scrmBrandTheme(), uni()],
})
