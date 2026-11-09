/**
 * 用户端小秘书工作台配置（GET /api/v1/biz/workbench，optional auth）
 *
 * 后端下发的是一份「可运营」的配置：persona 文案、快捷问题、能力包（packs）与
 * 转人工话术。页面只渲染接口真实下发的数据，不用前端常量伪造能力卡。
 *
 * 接口失败时返回内置兜底（仅名称/欢迎语，packs 与快捷问题为空），并带
 * `fallback: true` 供页面展示 ErrorState + 重试；`fallback` 是客户端内部标记，
 * 不来自后端，也不会随请求上行。
 */
import { request } from '../utils/request'

export interface WorkbenchPersona {
  name: string
  avatar?: string
  welcome: string
  disclaimer: string
}

export interface WorkbenchPack {
  key: string
  name: string
  icon: string
  description: string
  quick: string[]
  entry: string | null
  fallback: boolean
  requires_login: boolean
}

export interface WorkbenchHandoff {
  mode: string
  message: string
}

export interface WorkbenchChat {
  conversations: boolean
  conversations_api: string
  /** 以下字段来自后端，页面当前不消费，但保留完整契约透传 */
  stream?: string
  scope?: string
  ask?: string
  [key: string]: unknown
}

export interface Workbench {
  persona: WorkbenchPersona
  quick_questions: string[]
  packs: WorkbenchPack[]
  handoff: WorkbenchHandoff
  chat: WorkbenchChat
  /** 客户端内部标记：true 表示本次返回的是接口失败兜底，页面应展示重试 */
  fallback?: boolean
}

const FALLBACK_WELCOME = '你好，我是你的智能小秘书，有什么可以帮你？'

/** 内置兜底：只保留最小可用的问候，不伪造任何能力包或快捷问题 */
export const WORKBENCH_FALLBACK: Workbench = {
  persona: {
    name: '智能小秘书',
    avatar: '',
    welcome: FALLBACK_WELCOME,
    disclaimer: '',
  },
  quick_questions: [],
  packs: [],
  handoff: {
    mode: 'message',
    message: '',
  },
  chat: {
    conversations: false,
    conversations_api: '',
  },
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
    : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePack(raw: unknown): WorkbenchPack | null {
  if (!isRecord(raw)) return null
  const name = asString(raw.name).trim()
  if (!name) return null
  const entry = asString(raw.entry).trim()
  return {
    key: asString(raw.key).trim() || name,
    name,
    icon: asString(raw.icon).trim(),
    description: asString(raw.description).trim(),
    quick: asStringArray(raw.quick),
    entry: entry || null,
    fallback: raw.fallback === true,
    requires_login: raw.requires_login === true,
  }
}

function normalizeWorkbench(raw: unknown): Workbench {
  const source = isRecord(raw) ? raw : {}
  const personaRaw = isRecord(source.persona) ? source.persona : {}
  const handoffRaw = isRecord(source.handoff) ? source.handoff : {}
  const chatRaw = isRecord(source.chat) ? source.chat : {}

  const chat: WorkbenchChat = {
    ...chatRaw,
    conversations: chatRaw.conversations === true,
    conversations_api: asString(chatRaw.conversations_api),
  }
  for (const key of ['stream', 'scope', 'ask'] as const) {
    const value = asString(chatRaw[key]).trim()
    if (value) chat[key] = value
  }

  return {
    persona: {
      name: asString(personaRaw.name).trim() || WORKBENCH_FALLBACK.persona.name,
      avatar: asString(personaRaw.avatar).trim(),
      welcome: asString(personaRaw.welcome).trim() || WORKBENCH_FALLBACK.persona.welcome,
      disclaimer: asString(personaRaw.disclaimer).trim(),
    },
    quick_questions: asStringArray(source.quick_questions),
    packs: Array.isArray(source.packs)
      ? source.packs.map(normalizePack).filter((pack): pack is WorkbenchPack => pack !== null)
      : [],
    handoff: {
      mode: asString(handoffRaw.mode).trim(),
      message: asString(handoffRaw.message).trim(),
    },
    chat,
    fallback: false,
  }
}

/** 失败兜底（每次返回新对象，避免调用方误改共享常量） */
function fallbackWorkbench(): Workbench {
  return {
    ...WORKBENCH_FALLBACK,
    persona: { ...WORKBENCH_FALLBACK.persona },
    quick_questions: [],
    packs: [],
    handoff: { ...WORKBENCH_FALLBACK.handoff },
    chat: { ...WORKBENCH_FALLBACK.chat },
    fallback: true,
  }
}

/**
 * 读取工作台配置。任何请求/解析失败都降级为内置兜底（不向页面抛错）；
 * 页面据 `workbench.fallback` 展示 ErrorState 与重试。
 */
export async function getWorkbench(): Promise<Workbench> {
  try {
    const data = await request<unknown>({
      url: '/biz/workbench',
      method: 'GET',
      auth: 'optional',
    })
    return normalizeWorkbench(data)
  } catch {
    return fallbackWorkbench()
  }
}
