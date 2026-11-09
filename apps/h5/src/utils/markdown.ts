/**
 * Markdown → rich-text HTML（C 端 AI 回答渲染）
 *
 * AI 回答是 Markdown，直接塞进 <text> 会把 `**` `*` `|` 原样显示，长答案看起来像没排版。
 * 这里覆盖问答里实际会出现的语法：标题、段落、有序/无序列表、表格、引用、围栏代码块、
 * 行内代码、加粗、斜体、删除线、链接。链接与图片不生成可点/可加载节点（小程序禁止外跳，
 * 图片域名也不在 downloadFile 白名单），只保留可读文案。
 *
 * 安全：所有文本先转义再拼标签，模型输出永远不会被当成 HTML 执行。
 *
 * 单位：rich-text 只认节点上的行内 style，且不跟随外部 rpx 缩放；这里按设计稿 750 宽
 * 折算成 px（scale = windowWidth / 750，与 uni 的 rpx 同口径），让文档排版与页面其余
 * 部分一起缩放，避免正文与标题大小错位。
 */

const FALLBACK_SCALE = 0.5

/** 标题 h1~h6 对应的设计稿尺寸（rpx） */
const HEADING_RPX = [34, 32, 30, 28, 28, 28]

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => HTML_ESCAPES[ch])
}

/** 当前设备的 rpx→px 系数；单测/非 uni 运行时按 375pt 设计宽度折算 */
function currentScale(): number {
  const host = (globalThis as { uni?: { getSystemInfoSync?: () => { windowWidth?: number } } }).uni
  try {
    const width = host?.getSystemInfoSync?.().windowWidth ?? 0
    if (width > 0) return width / 750
  } catch {
    // 忽略：退回设计宽度
  }
  return FALLBACK_SCALE
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableDivider(line: string): boolean {
  if (!line.includes('|')) return false
  const cells = splitTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))
}

/**
 * 行内语法。行内代码先摘出占位，避免其中的 `*` `_` 被误当强调标记；
 * 链接同样先摘出，保证 URL 里的字符不参与解析。
 */
function renderInline(raw: string, px: (rpx: number) => string): string {
  const codes: string[] = []
  const links: string[] = []

  let text = raw.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(
      `<code style="padding:0 ${px(6)};border-radius:${px(6)};background:#eef0f3;font-size:${px(24)};font-family:monospace">${escapeHtml(code)}</code>`,
    )
    return `\u0000${codes.length - 1}\u0000`
  })

  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => `[${alt || '图片'}]`)
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, (_match, label: string) => {
    links.push(`<span style="color:#576b95;text-decoration:underline">${escapeHtml(label)}</span>`)
    return `\u0001${links.length - 1}\u0001`
  })

  text = escapeHtml(text)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:600">$1</strong>')
  text = text.replace(/__([^_]+)__/g, '<strong style="font-weight:600">$1</strong>')
  text = text.replace(/~~([^~]+)~~/g, '<span style="text-decoration:line-through">$1</span>')
  // 斜体在加粗之后处理；要求内容不以空白开头，避免把 `2 * 3 * 4` 这类算式吃掉
  text = text.replace(
    /(^|[^*])\*([^\s*][^*\n]*?)\*(?!\*)/g,
    '$1<em style="font-style:italic">$2</em>',
  )

  text = text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codes[Number(index)])
  text = text.replace(/\u0001(\d+)\u0001/g, (_match, index: string) => links[Number(index)])
  return text
}

function renderTable(
  header: string[],
  rows: string[][],
  px: (rpx: number) => string,
  inline: (text: string) => string,
): string {
  const cellStyle = `border:1px solid #e5e7eb;padding:${px(10)} ${px(12)};line-height:1.5;text-align:left;vertical-align:top`
  const head = header
    .map(
      (cell) =>
        `<th style="${cellStyle};background:#f7f8fa;font-weight:600;color:#1f2329">${inline(cell)}</th>`,
    )
    .join('')
  const body = rows
    .map(
      (row) =>
        `<tr>${header
          .map(
            (_cell, index) =>
              `<td style="${cellStyle};color:#4b5563">${inline(row[index] ?? '')}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')

  return `<div style="margin:0 0 ${px(18)};overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:${px(24)}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderBlocks(input: string, px: (rpx: number) => string): string {
  const inline = (text: string): string => renderInline(text, px)
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let paragraph: string[] = []

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return
    out.push(
      `<div style="margin:0 0 ${px(18)};line-height:1.6">${paragraph.map(inline).join('<br/>')}</div>`,
    )
    paragraph = []
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    // 围栏代码块；```markdown 视为「整段被包了一层」的解包写法，继续按 Markdown 渲染
    const fence = /^```([\w-]*)\s*$/.exec(trimmed)
    if (fence) {
      flushParagraph()
      const body: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      const language = fence[1].toLowerCase()
      if (language === 'markdown' || language === 'md') {
        out.push(renderBlocks(body.join('\n'), px))
      } else {
        out.push(
          `<pre style="margin:0 0 ${px(18)};padding:${px(16)};border-radius:${px(10)};background:#f4f5f7;font-size:${px(24)};font-family:monospace;white-space:pre-wrap;word-break:break-word">${escapeHtml(body.join('\n'))}</pre>`,
        )
      }
      continue
    }

    // 表格：表头行 + 分隔行（|---|:--:|）才算，避免把正文里的竖线误判成表格
    if (trimmed.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushParagraph()
      const header = splitTableRow(trimmed)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(splitTableRow(lines[i]))
        i += 1
      }
      i -= 1
      out.push(renderTable(header, rows, px, inline))
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      const size = HEADING_RPX[heading[1].length - 1]
      const marginTop = out.length > 0 ? px(18) : '0'
      out.push(
        `<div style="font-size:${px(size)};font-weight:600;line-height:1.4;color:#1f2329;margin:${marginTop} 0 ${px(12)}">${inline(heading[2])}</div>`,
      )
      continue
    }

    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      flushParagraph()
      out.push(`<div style="height:1px;background:#e5e7eb;margin:${px(18)} 0"></div>`)
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph()
      const quote: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      i -= 1
      out.push(
        `<div style="margin:0 0 ${px(18)};padding:${px(8)} ${px(14)};border-left:${px(6)} solid #dfe3e8;background:#f8f9fa;color:#6b7280">${quote.map(inline).join('<br/>')}</div>`,
      )
      continue
    }

    // 列表：连续同类行合并成一组，两个空格以上缩进视为二级
    const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(line)
    if (listItem) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length) {
        const match = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(lines[i])
        if (!match) break
        const depth = match[1].replace(/\t/g, '  ').length >= 2 ? 1 : 0
        const marker = /^\d/.test(match[2]) ? `${parseInt(match[2], 10)}.` : '•'
        items.push(
          `<div style="margin:0 0 ${px(6)};padding-left:${px(depth * 32 + 28)};text-indent:${px(-28)};line-height:1.6">${marker}&nbsp;${inline(match[3])}</div>`,
        )
        i += 1
      }
      i -= 1
      out.push(`<div style="margin:0 0 ${px(12)}">${items.join('')}</div>`)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      continue
    }
    paragraph.push(line)
  }

  flushParagraph()
  return out.join('')
}

export function markdownToRichText(input: string): string {
  if (!input) return ''
  const scale = currentScale()
  const px = (rpx: number): string => `${Math.round(rpx * scale * 100) / 100}px`
  return renderBlocks(input, px)
}
