#!/usr/bin/env node
/**
 * 小程序构建后注入 appid
 *
 * uni build 从 manifest.json 的 mp-weixin.appid 生成 project.config.json；
 * 本仓按租户构建、appid 不入库（manifest 里为空），因此构建产物默认是
 * touristappid —— 游客态包无法上传。上传前用 MP_WEIXIN_APPID 注入真实 appid。
 *
 * 用法：
 *   MP_WEIXIN_APPID=wx... pnpm build:mp-weixin
 *   node scripts/patch-mp-appid.mjs [产物目录]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = process.argv[2] ?? 'apps/h5/dist/build/mp-weixin'
const appid = (process.env.MP_WEIXIN_APPID ?? '').trim()
const file = resolve(ROOT, distDir, 'project.config.json')

if (!existsSync(file)) {
  console.error(`[patch-mp-appid] 找不到构建产物 ${file}`)
  process.exit(1)
}

if (!/^wx[0-9a-f]{16}$/.test(appid)) {
  console.log('[patch-mp-appid] 未设置 MP_WEIXIN_APPID，保留构建默认 appid（游客态，不可上传）')
  process.exit(0)
}

const cfg = JSON.parse(readFileSync(file, 'utf8'))
cfg.appid = appid
writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`)
console.log(`[patch-mp-appid] appid -> ${appid}`)
