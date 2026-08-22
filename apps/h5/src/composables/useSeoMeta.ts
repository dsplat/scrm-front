import { watch, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

/**
 * 页面级 SEO 元数据（M1 方案 A4）
 *
 * 动态设置 document.title / <meta name="description"> / <link rel="canonical">，
 * 供搜索引擎与 AI 引擎(GEO)抓取页面级语义。
 *
 * canonical 规则：自指——指向当前请求域名下的规范 URL（不做跨域聚合），
 * 传入 canonicalPath（如 '/h5/pages/course/detail?id=123'）即可，
 * 自动拼 location.origin 形成当前域名的规范链接。
 *
 * 用法（页面 <script setup>）：
 *   useSeoMeta(() => ({
 *     title: detail.value ? `${detail.value.name} - 课程详情` : '课程详情',
 *     description: detail.value?.intro?.slice(0, 80),
 *     canonicalPath: `/h5/pages/course/detail?id=${courseId}`,
 *   }))
 *
 * getter 返回值变化时自动更新（响应式）；onShow 时兜底刷新（返回/切回页面）。
 */

export interface SeoMetaInput {
  /** 页面标题（空则不覆盖） */
  title?: string
  /** 页面描述（空则移除 description 标签，避免残留上一页面内容） */
  description?: string
  /** canonical 路径（含 /h5/ 前缀与 query），空则移除 canonical 标签 */
  canonicalPath?: string
}

/** 获取或创建单例 meta/link 标签 */
function upsertMeta(name: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(name: string): void {
  document.querySelector(`meta[name="${name}"]`)?.remove()
}

function upsertCanonical(href: string): void {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeCanonical(): void {
  document.querySelector('link[rel="canonical"]')?.remove()
}

function applyMeta(meta: SeoMetaInput): void {
  if (meta.title) {
    document.title = meta.title
  }
  if (meta.description) {
    upsertMeta('description', meta.description)
  } else {
    removeMeta('description')
  }
  if (meta.canonicalPath) {
    // 自指：当前请求域名 + 规范路径（多租户域名同内容，不跨域聚合）
    upsertCanonical(`${location.origin}${meta.canonicalPath}`)
  } else {
    removeCanonical()
  }
}

export function useSeoMeta(getter: () => SeoMetaInput): void {
  // #ifdef H5
  const apply = () => {
    try {
      applyMeta(getter())
    } catch {
      /* SEO 元数据失败不阻断页面渲染 */
    }
  }

  onMounted(apply)
  onShow(apply)
  watch(getter, apply, { deep: true })
  // #endif
}
