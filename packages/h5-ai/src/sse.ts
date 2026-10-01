/// <reference types="@dcloudio/types" />
/**
 * SSE 传输适配层
 *
 * 只负责「把 POST 请求发出去，把响应体按到达顺序逐块解码成文本回调出去」，
 * 不解析线协议（0:/2:/9:/a:/3:/d: 帧的拆分与语义在 useAssistantStream 完成）。
 * 这样双端复用同一份解析逻辑，只有传输实现不同：
 *
 * - H5：浏览器 fetch + ReadableStream + TextDecoder（流式增量读取）。
 * - 小程序（预留）：uni.request({ enableChunked: true }) + RequestTask.onChunkReceived，
 *   每块给 ArrayBuffer，手动 UTF-8 解码。小程序端未纳入本期验证，接口预留。
 *
 * 认证/租户头由调用方经 headers 传入（Bearer + X-Tenant-ID），本层不关心其语义。
 */

export interface StreamOptions {
  /** 完整请求 URL */
  url: string
  /** 请求头（Content-Type / Authorization / X-Tenant-ID 等） */
  headers: Record<string, string>
  /** 请求体（JSON 字符串） */
  body: string
  /** 每收到一段解码后的文本增量回调一次（可能包含多行或半行，由上层缓冲切分） */
  onData: (chunk: string) => void
  /** 流正常结束（读尽/请求完成且状态码 ok）回调 */
  onDone: () => void
  /** 出错（网络失败 / 非 2xx / 主动中断）回调；不抛出 */
  onError: (err: { message: string; statusCode?: number }) => void
}

export interface StreamHandle {
  /** 中断当前流（用户取消 / 空闲超时） */
  abort(): void
}

/**
 * H5：fetch 流式读取。浏览器 API 用宽松类型规避 DOM lib 配置依赖。
 */
function postStreamH5(opts: StreamOptions): StreamHandle {
  const controller = new AbortController()

  void (async () => {
    try {
      const fetchFn = (globalThis as any).fetch
      const response = await fetchFn(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        body: opts.body,
        signal: controller.signal,
      })

      if (!response.ok) {
        let message = 'AI 助手暂时不可用，请使用页面原有功能。'
        if (response.status === 504 || response.status === 502)
          message = 'AI 服务响应超时，请稍后重试。'
        else if (response.status === 429) message = '请求过于频繁，请稍后重试。'
        try {
          const err = await response.json()
          if (err && err.message) message = err.message
        } catch {
          /* 非 JSON 错误体，保留状态码文案 */
        }
        opts.onError({ message, statusCode: response.status })
        return
      }

      if (!response.body) {
        opts.onError({ message: 'AI 助手响应为空，请稍后重试。' })
        return
      }

      const reader = response.body.getReader()
      const decoder = new (globalThis as any).TextDecoder('utf-8')
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) opts.onData(decoder.decode(value, { stream: true }))
      }
      opts.onDone()
    } catch (e: any) {
      if (e && e.name === 'AbortError')
        opts.onError({ message: 'AI 响应已中断，页面功能不受影响。' })
      else opts.onError({ message: 'AI 助手连接失败，请使用页面原有功能。' })
    }
  })()

  return { abort: () => controller.abort() }
}

/**
 * 小程序（预留）：uni.request enableChunked + onChunkReceived。
 *
 * 说明：wx.request 的 onChunkReceived 每帧回调 ArrayBuffer，需手动 UTF-8 解码；
 * 非 2xx 时 Node 引擎返回的是 JSON 错误体（非 SSE），complete 阶段据 statusCode 降级。
 */
function postStreamMP(opts: StreamOptions): StreamHandle {
  let aborted = false
  // RequestTask 的 onChunkReceived 是小程序专有 API，@dcloudio/types 未声明，宽松类型规避
  const task = uni.request({
    url: opts.url,
    method: 'POST',
    header: { 'Content-Type': 'application/json', ...opts.headers },
    data: opts.body,
    enableChunked: true,
    success: (res: any) => {
      if (aborted) return
      if (res.statusCode >= 400) {
        const body = res.data as any
        opts.onError({
          message: (body && body.message) || 'AI 助手暂时不可用，请稍后重试。',
          statusCode: res.statusCode,
        })
        return
      }
      opts.onDone()
    },
    fail: () => {
      if (!aborted) opts.onError({ message: 'AI 助手连接失败，请使用页面原有功能。' })
    },
  })

  ;(task as any).onChunkReceived((res: any) => {
    if (aborted) return
    const bytes = new Uint8Array(res.data as ArrayBuffer)
    opts.onData(decodeUtf8(bytes))
  })

  return {
    abort: () => {
      aborted = true
      task.abort()
    },
  }
}

/** 手写 UTF-8 解码（小程序无稳定 TextDecoder），供 enableChunked 分块解码用 */
function decodeUtf8(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b1 = bytes[i]
    if (b1 < 0x80) {
      out += String.fromCharCode(b1)
      i += 1
    } else if (b1 >= 0xc0 && b1 < 0xe0) {
      const b2 = bytes[i + 1]
      out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
      i += 2
    } else if (b1 >= 0xe0 && b1 < 0xf0) {
      const b2 = bytes[i + 1]
      const b3 = bytes[i + 2]
      out += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
      i += 3
    } else {
      const b2 = bytes[i + 1]
      const b3 = bytes[i + 2]
      const b4 = bytes[i + 3]
      let cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)
      cp -= 0x10000
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff))
      i += 4
    }
  }
  return out
}

/**
 * 发起一次流式 POST。按平台条件编译选择传输实现。
 *
 * vue-tsc 不处理条件编译注释，会同时看到两个 return（第二个不可达但合法），
 * 两个分支函数定义在不同函数体内，无重标识符冲突；uni 构建期会移除未命中的分支。
 */
export function postStream(opts: StreamOptions): StreamHandle {
  // #ifdef H5
  return postStreamH5(opts)
  // #endif
  // #ifndef H5
  return postStreamMP(opts)
  // #endif
}
