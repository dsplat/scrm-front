import { strict as assert } from 'node:assert'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(appRoot, '../..')
const srcRoot = join(appRoot, 'src')
const manifest = JSON.parse(readFileSync(join(srcRoot, 'pages.json'), 'utf8')) as {
  pages: Array<{ path: string }>
  tabBar: { list: Array<{ pagePath: string }> }
}
const tabPages = new Set(manifest.tabBar.list.map((page) => page.pagePath))

function collectSourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(path)
    return ['.vue', '.ts'].includes(extname(entry.name)) ? [path] : []
  })
}

function readPageWithCommerceViews(pagePath: string): string {
  const source = readFileSync(join(srcRoot, `${pagePath}.vue`), 'utf8')
  const views = Array.from(
    source.matchAll(/@scrm\/h5-commerce\/src\/views\/([A-Za-z0-9]+)\.vue/g),
    (match) =>
      readFileSync(join(repoRoot, 'packages/h5-commerce/src/views', `${match[1]}.vue`), 'utf8'),
  )
  return [source, ...views].join('\n')
}

test('所有非 tabBar 页面都有返回或首页出口', () => {
  const orphans = manifest.pages
    .map((page) => page.path)
    .filter((path) => !tabPages.has(path))
    .filter((path) => {
      const source = readPageWithCommerceViews(path).replace(
        /<NavBar\b[^>]*:show-back="false"[^>]*\/>/gs,
        '',
      )
      return !/<NavBar\b|<ErrorState\b|uni\.(?:navigateBack|switchTab|reLaunch)\s*\(/.test(source)
    })

  assert.deepEqual(orphans, [])
})

test('客服 tab 页保留显式返回出口', () => {
  const source = readFileSync(join(srcRoot, 'pages/self-service/index.vue'), 'utf8')
  assert.match(source, /<NavBar\b/)
  assert.doesNotMatch(source, /<NavBar\b[^>]*:show-back="false"/s)
})

test('非企微环境的侧边栏异常态可返回首页', () => {
  const source = readFileSync(join(srcRoot, 'pages/wecom-sidebar/index.vue'), 'utf8')
  assert.match(
    source,
    /v-if="unsupported"[\s\S]*?<button[^>]*@tap="goHome"[^>]*>返回首页<\/button>/,
  )
  assert.match(
    source,
    /function goHome\(\)[\s\S]*?uni\.switchTab\(\{ url: '\/pages\/index\/index' \}\)/,
  )
})

test('不得使用 navigateTo 或 redirectTo 打开 tabBar 页面', () => {
  const roots = [
    srcRoot,
    join(repoRoot, 'packages/h5-commerce/src'),
    join(repoRoot, 'packages/h5-ai/src'),
  ]
  const invalid: string[] = []

  for (const file of roots.flatMap(collectSourceFiles)) {
    const source = readFileSync(file, 'utf8')
    const calls = source.matchAll(/uni\.(navigateTo|redirectTo)\s*\(\s*\{([^}]*)\}/g)
    for (const call of calls) {
      const property = call[2].match(/\burl\s*:\s*([^,\n]+)/)
      const url = property?.[1].trim().match(/^(['"])(\/[^'"]+)\1$/)
      if (!url) continue
      const target = url[2].split('?')[0].slice(1)
      if (tabPages.has(target)) {
        invalid.push(`${relative(repoRoot, file)}: ${call[1]}(${url[2]})`)
      }
    }
  }

  assert.deepEqual(invalid, [])
})

test('返回失败时统一回首页', () => {
  const files = [
    join(srcRoot, 'components/NavBar.vue'),
    join(srcRoot, 'components/ErrorState.vue'),
    join(repoRoot, 'packages/h5-commerce/src/components/NavBar.vue'),
    join(repoRoot, 'packages/h5-commerce/src/components/ErrorState.vue'),
  ]

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /uni\.navigateBack\(\{\s*fail:\s*goHome\s*\}\s*\)/, file)
    assert.match(source, /function goHome\(\)[\s\S]*?uni\.switchTab\(/, file)
  }
})
