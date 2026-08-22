/**
 * H5 构建产物 SEO 补丁（M1 方案 A3 后置处理）
 *
 * 背景：uni-app H5 构建会清空 index.html 的 <title>（运行时由路由按
 * pages.json 重写 document.title），导致搜索引擎抓取到的 HTML 源标题为空。
 * 本脚本在 `uni build` 之后回填产物 index.html 的静态 title，
 * 供爬虫/AI 引擎读取；真实用户运行时仍由路由与 useSeoMeta 动态覆盖。
 *
 * description / OG / JSON-LD 标签不受构建清空影响，已在源 index.html 保留。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const target = resolve(__dirname, '../apps/h5/dist/build/h5/index.html')

const TITLE = '内行商城 - 课程・商城・活动一站式服务平台'

const html = readFileSync(target, 'utf-8')
if (!html.includes('<title></title>')) {
  console.log('[patch-h5-seo] title 非空，无需回填')
  process.exit(0)
}

const patched = html.replace('<title></title>', `<title>${TITLE}</title>`)
writeFileSync(target, patched, 'utf-8')
console.log(`[patch-h5-seo] 已回填产物 title: ${TITLE}`)
