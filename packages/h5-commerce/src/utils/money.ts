/**
 * 金额单位契约与展示/输入格式化 —— SCRM h5 前端共享。
 *
 * 与框架 `resources/js/ui-core/money.ts` 同源（决策：docs/decisions/2026-09-30-amount-unit-integer-fen.md）：
 *  - 交易金额 / 价格 / 余额 / 抵扣：整数「分」（1 元 = 100 分）
 *  - 单价与成本统计（精度 >2 位小数）：整数「微元」（1 元 = 1e6 微元）
 *  - 比率 / 用量 / 数量：保持原值，不经本模块转换
 *
 * 后端 API 一律以整数最小单位出入参；前端仅在「展示」与「表单输入」两个边界
 * 做单位转换，杜绝在业务代码里散落 `/ 100`、`* 100`、`toFixed(2)`。
 */

/** 允许传入 number / 数字字符串 / null / undefined 的数值入参 */
export type MoneyInput = number | string | null | undefined

const toNum = (v: MoneyInput): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 分 → 元（数值，供输入框绑定或后续计算） */
export const fenToYuanNumber = (fen: MoneyInput): number => toNum(fen) / 100

/** 元 → 分（四舍五入取整，提交前转换，避免浮点尾差） */
export const yuanToFen = (yuan: MoneyInput): number => Math.round(toNum(yuan) * 100)

/** 分 → 纯数字串（两位小数，无符号）：12345 → '123.45' */
export const fenToYuan = (fen: MoneyInput, digits = 2): string => (toNum(fen) / 100).toFixed(digits)

/** 分 → 人民币展示串：12345 → '¥123.45' */
export const formatFen = (fen: MoneyInput): string => `¥${fenToYuan(fen)}`

/** 微元 → 元（数值） */
export const microToYuanNumber = (micro: MoneyInput): number => toNum(micro) / 1_000_000

/** 元 → 微元（四舍五入取整） */
export const yuanToMicro = (yuan: MoneyInput): number => Math.round(toNum(yuan) * 1_000_000)

/**
 * 微元 → 人民币展示串（÷1e6），保留有效小数并去除多余尾零，至少两位。
 */
export const formatMicro = (micro: MoneyInput): string => {
  const yuan = toNum(micro) / 1_000_000
  let s = yuan.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
  const dot = s.indexOf('.')
  const decLen = dot < 0 ? 0 : s.length - dot - 1
  if (decLen < 2) s = yuan.toFixed(2)
  return `¥${s}`
}
