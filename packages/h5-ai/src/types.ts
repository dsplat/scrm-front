/**
 * @scrm/h5-ai 类型定义（与 Node SSE 数据流协议对齐）
 *
 * 传输层走 ai-streaming Node 引擎（Vercel AI SDK data stream 行协议：每行「类型:JSON」），
 * 编排语义（鉴权/配额/工具执行/落库）由引擎回调 PHP 契约 API 完成。
 * 本包只做「前端消费」：镜像 Console ai-assistant 的线协议解析，去掉 Console 专有的
 * 场景落地页（scene）等重上下文，保留 H5 需要的核心形态。
 */

/** 页面上下文（H5 版，注入当前页信息供助手理解语境；无 scene 字段） */
export interface PageContext {
  /** 页面路由标识（点分，如 my.orders） */
  route: string
  /** 模块名（如 Order） */
  module: string
  entity_type?: string | null
  entity_id?: number | null
  form_state?: Record<string, any>
  visible_data_summary?: string
  user_intent?: string | null
  /** 续接已有会话 */
  conversation_id?: number | null
  /** 显式指定目标员工（缺省由 PHP resolve 兜底系统小助手） */
  agent_id?: number | string | null
}

/** 会话元信息（Node 经 2: data 帧下发，前端持久化用于刷新续接） */
export interface ConversationMeta {
  conversation_id: number
  agent_id?: number | null
}

/** 工具调用执行状态（9: 帧置 running，a: 帧置 done/error） */
export type ToolCallStatus = 'running' | 'done' | 'error'

/** 工具调用结构 */
export interface ToolCall {
  id?: string
  slug?: string
  name?: string
  arguments?: Record<string, any>
  status?: ToolCallStatus
  [key: string]: any
}

/** 表单智能填充建议（AI → 前端） */
export interface FormFillSuggestion {
  fields: Record<string, any>
  explanation?: string
  field_notes?: Record<string, string>
  confidence?: number
}

/** 工作流步骤状态 */
export type WorkflowStepStatus = 'pending' | 'current' | 'done' | 'warning' | 'error'

/** 工作流步骤 */
export interface WorkflowStep {
  key: string
  label: string
  status: WorkflowStepStatus
  draft?: Record<string, any>
  message?: string
}

/** 工作流编排数据（AI → 前端） */
export interface WorkflowSuggestion {
  name: string
  steps: WorkflowStep[]
  submit_endpoint?: string
  submit_payload?: Record<string, any>
  explanation?: string
}

/** L2 操作确认卡片数据（a: 帧 pending_confirmation → 前端） */
export interface ActionConfirmData {
  token: string
  args_hash: string
  expires_in: number
  tool_slug: string
  tool_name: string
  arguments: Record<string, any>
  conversation_id: number
}

/** 确认卡片交互状态 */
export type ActionConfirmStatus =
  'pending' | 'confirming' | 'executed' | 'cancelled' | 'expired' | 'error'

/** 选项卡片数据（ask_user_choice 工具结果 → 前端） */
export interface UserChoiceData {
  question: string
  options: string[]
  multiple: boolean
}

/**
 * 单步完成信息（`e:` finish_step 控制帧 → 前端，BL-059）
 *
 * Node 引擎多步链（工具轮次/任务链）每完成一步下发一帧。前端仅透传/记录，
 * 用于在既有展示位（多步进度/日志）挂接「step 完成」信号。
 * `usage` 只透传，**不参与授权或计费**（计费属后端）。
 */
export interface StepFinishInfo {
  /** 本步结束原因（如 stop / tool-calls / length） */
  finishReason?: string
  /** token 用量（原样透传，未做结构约束） */
  usage?: unknown
  /** 是否还有后续步骤（引擎携带时透传） */
  isContinued?: boolean
}

/** 对话消息（前端渲染用） */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  /** 文本内容（流式累积） */
  content: string
  toolCalls?: ToolCall[]
  formFill?: FormFillSuggestion | null
  workflow?: WorkflowSuggestion | null
  actionConfirm?: ActionConfirmData | null
  confirmStatus?: ActionConfirmStatus
  confirmFeedback?: string | null
  userChoice?: UserChoiceData | null
  /** 已提交的选项（选择后锁定卡片，防重复点选） */
  userChoiceAnswer?: string[] | null
  /** 错误消息附带的操作按钮 */
  action?: { label: string; route: string } | null
  /** 是否正在流式输出 */
  streaming?: boolean
  /** 是否为错误消息 */
  isError?: boolean
  /** 时间戳 */
  timestamp: number
}

/** 上行历史轮次（纯文本；引擎无状态时多轮记忆由前端携带） */
export interface HistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

/** 助手可用性状态 */
export interface AvailabilityState {
  loaded: boolean
  available: boolean
}

/** 流式回调集合（useAssistantStream 逐帧驱动） */
export interface StreamCallbacks {
  onMeta?: (meta: ConversationMeta) => void
  onText: (text: string) => void
  onToolCall: (calls: ToolCall[]) => void
  onToolResult?: (toolCallId: string, result: any) => void
  onFormFill?: (suggestion: FormFillSuggestion) => void
  onWorkflow?: (workflow: WorkflowSuggestion) => void
  onPendingConfirmation?: (data: ActionConfirmData) => void
  onUserChoice?: (data: UserChoiceData) => void
  /** 多步链单步完成（`e:` 帧）；无消费者时不挂即与旧行为一致 */
  onStepFinish?: (info: StepFinishInfo) => void
  onDone: (metadata?: Record<string, any> | null) => void
  onError: (message: string, action?: { label: string; route: string } | null) => void
}

/**
 * 协议约定：同步 UserAi 与流式 user scope 共用 allowed/answer/sources/denied 语义；
 * 流式只把 answer 拆为 text 事件，工具和错误分别对应 tool_call/error，结束为 done。
 */
export interface UserAiContract {
  allowed: boolean
  answer: string
  sources: Array<{ content: string; title?: string }>
  denied: string | null
}
