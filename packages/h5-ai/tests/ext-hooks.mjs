/**
 * ESM 解析钩子：把无扩展名的相对 import 补成 .ts（仅测试运行期用）
 *
 * 产品源码沿用 uni-app/Vite 的无扩展名写法（`import x from './config'`），
 * 而 Node 直跑 TS（--experimental-strip-types）要求显式扩展名。
 * 为不改动产物代码而让真实模块可被测试直接 import，这里补一层解析：
 * 只处理相对说明符，且仅当同名 .ts / index.ts 存在时才改写，其余原样透传。
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]{2,4}$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL).href
    for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) return next(candidate, context)
    }
  }
  return next(specifier, context)
}
