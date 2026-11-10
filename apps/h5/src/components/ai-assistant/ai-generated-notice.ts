/**
 * AI 生成内容合规标识（唯一事实源）。
 *
 * 微信小程序「深度合成-AI问答」类目要求 AI 生成内容在显著位置标注
 * 「AI生成 / 人工智能生成」或同等含义字样，审核按页面逐处核对；
 * 因此这句写死在前端，后台 persona.disclaimer 只能作补充说明，不能替换标识。
 */
export const AI_GENERATED_NOTICE = '内容由 AI 生成，仅供参考。'

/** 文本已含 AI 标识字样时不再重复展示，视为与合规标识等价 */
export function isAiNoticeLike(text: string): boolean {
  return /AI|人工智能/i.test(text)
}
