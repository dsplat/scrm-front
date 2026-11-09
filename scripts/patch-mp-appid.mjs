#!/usr/bin/env node
/**
 * 小程序构建后修正开发者工具项目配置（appid + 调试基础库）
 *
 * uni build 从 manifest.json 的 mp-weixin 段生成 project.config.json，但两件事
 * 它不管：
 * - appid：本仓按租户构建、appid 不入库（manifest 为空），产物默认是游客态包；
 * - libVersion（调试基础库）：uni 的 manifest schema 没有该字段，构建产物留空，
 *   开发者工具便自选「最新版」。若那台机器的 WeappVendor 缓存里没有对应包
 *   （2026-11-09 实测：缓存到 3.17.5，工具却选 3.17.6），模拟器会因
 *   `WAWebview.js not found in vendor` 返回 500 并白屏。
 *
 * 这两项都只是开发者工具的项目元数据，不进入用户运行时包，所以只能在构建后写。
 * 调试基础库用 MP_WEIXIN_LIB_VERSION 覆盖，缺省钉到已知可用版本；换成别的版本
 * 前先确认本机 `~/Library/Application Support/微信开发者工具/<hash>/WeappVendor`
 * 里已有对应 `.wxvpkg`，否则仍会白屏。
 *
 * 用法：
 *   MP_WEIXIN_APPID=wx... pnpm build:mp-weixin
 *   MP_WEIXIN_APPID=wx... MP_WEIXIN_LIB_VERSION=3.17.5 pnpm build:mp-weixin
 *   node scripts/patch-mp-appid.mjs [产物目录]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 缺省调试基础库：须为本机 WeappVendor 已有（或工具可下载）的版本 */
const DEFAULT_LIB_VERSION = '3.17.5'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = process.argv[2] ?? 'apps/h5/dist/build/mp-weixin'
const appid = (process.env.MP_WEIXIN_APPID ?? '').trim()
const libVersion = (process.env.MP_WEIXIN_LIB_VERSION ?? DEFAULT_LIB_VERSION).trim()
const file = resolve(ROOT, distDir, 'project.config.json')

if (!existsSync(file)) {
  console.error(`[patch-mp-appid] 找不到构建产物 ${file}`)
  process.exit(1)
}

const cfg = JSON.parse(readFileSync(file, 'utf8'))
const applied = []

if (/^wx[0-9a-f]{16}$/.test(appid)) {
  cfg.appid = appid
  applied.push(`appid -> ${appid}`)
} else {
  console.log('[patch-mp-appid] 未设置 MP_WEIXIN_APPID，保留构建默认 appid（游客态，不可上传）')
}

if (/^\d+\.\d+\.\d+$/.test(libVersion)) {
  cfg.libVersion = libVersion
  applied.push(`libVersion -> ${libVersion}`)
} else {
  console.log(`[patch-mp-appid] MP_WEIXIN_LIB_VERSION 非法（${libVersion}），保留构建默认值`)
}

if (applied.length > 0) {
  writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`)
  console.log(`[patch-mp-appid] ${applied.join(', ')}`)
}
