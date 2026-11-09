/// <reference types="@dcloudio/types" />
/**
 * SSE 传输适配层
 *
 * 只负责「把 POST 请求发出去，把响应体按到达顺序逐块解码成文本回调出去」，
 * 不解析线协议（0:/2:/9:/a:/3:/d: 帧的拆分与语义在 useAssistantStream 完成）。
 * 这样双端复用同一份解析逻辑，只有传输实现不同：
 *
 * - H5：浏览器 fetch + ReadableStream + TextDecoder（流式增量读取）。
 * - 小程序：uni.request({ enableChunked: true }) + RequestTask.onChunkReceived，
 *   每块给 ArrayBuffer，手动增量 UTF-8 解码（分块边界可能切在多字节字符中间）。
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
 * 小程序：uni.request enableChunked + onChunkReceived。
 *
 * 说明：wx.request 的 onChunkReceived 每帧回调 ArrayBuffer，需手动 UTF-8 解码；
 * 非 2xx 时 Node 引擎返回的是 JSON 错误体（非 SSE），complete 阶段据 statusCode 降级。
 *
 * 低版本基础库（< 2.20.2）不认 enableChunked、没有 onChunkReceived：此时不会产生
 * 任何分块，整包落在 success 的 res.data 里，按单块补发一次 —— 逐字变整包，但不空白。
 */
function postStreamMP(opts: StreamOptions): StreamHandle {
  let aborted = false
  let chunkCount = 0
  const decode = createUtf8StreamDecoder()

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
        const body = typeof res.data === 'string' ? safeJson(res.data) : res.data
        opts.onError({
          message: (body && body.message) || 'AI 助手暂时不可用，请稍后重试。',
          statusCode: res.statusCode,
        })
        return
      }
      if (chunkCount === 0 && typeof res.data === 'string' && res.data) opts.onData(res.data)
      opts.onDone()
    },
    fail: () => {
      if (!aborted) opts.onError({ message: 'AI 助手连接失败，请使用页面原有功能。' })
    },
  })

  const onChunkReceived = (task as any).onChunkReceived
  if (typeof onChunkReceived === 'function') {
    onChunkReceived.call(task, (res: any) => {
      if (aborted) return
      chunkCount += 1
      opts.onData(decode(new Uint8Array(res.data as ArrayBuffer)))
    })
  }

  return {
    abort: () => {
      if (aborted) return
      aborted = true
      task.abort()
    },
  }
}

/** 小程序的传输实现（`postStream` 在非 H5 构建下直接返回它），导出供传输层测试驱动 */
export { postStreamMP }

function safeJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * 增量 UTF-8 解码（小程序无稳定 TextDecoder），供 enableChunked 分块解码用。
 *
 * 分块边界不保证落在字符边界上：一个汉字 3 字节，可能 1+2 或 2+1 跨两块到达。
 * 因此尾部不完整的序列必须留到下一块再拼，否则会解出乱码。
 * 无参调用等于「流已结束、丢弃残留」——合法流不会以半个字符收尾。
 */
export function createUtf8StreamDecoder(): (chunk?: Uint8Array) => string {
  let carry: Uint8Array = new Uint8Array(0)

  return (chunk?: Uint8Array): string => {
    if (!chunk || chunk.length === 0) {
      carry = new Uint8Array(0)
      return ''
    }

    let bytes = chunk
    if (carry.length > 0) {
      bytes = new Uint8Array(carry.length + chunk.length)
      bytes.set(carry, 0)
      bytes.set(chunk, carry.length)
    }

    let out = ''
    let i = 0
    while (i < bytes.length) {
      const b1 = bytes[i]
      let need = 0
      let cp = 0

      if (b1 < 0x80) {
        out += String.fromCharCode(b1)
        i += 1
        continue
      } else if (b1 >= 0xc2 && b1 < 0xe0) {
        need = 1
        cp = b1 & 0x1f
      } else if (b1 >= 0xe0 && b1 < 0xf0) {
        need = 2
        cp = b1 & 0x0f
      } else if (b1 >= 0xf0 && b1 < 0xf5) {
        need = 3
        cp = b1 & 0x07
      } else {
        // 非法首字节（含游离的续字节）：跳过，避免把后续字节连坐成乱码
        i += 1
        continue
      }

      if (i + need >= bytes.length) break // 尾序列不完整，留到下一块
      for (let k = 1; k <= need; k += 1) cp = (cp << 6) | (bytes[i + k] & 0x3f)
      i += need + 1

      if (cp > 0xffff) {
        const v = cp - 0x10000
        out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff))
      } else {
        out += String.fromCharCode(cp)
      }
    }

    carry = i < bytes.length ? bytes.slice(i) : new Uint8Array(0)
    return out
  }
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
