import { marked } from 'marked'

export interface ParsedHeadingInfo {
  isHeading: boolean
  level: number
  headingText: string
}

/**
 * 预处理翻译文本中的出版物与 Markdown 特殊标记（如 ^(3)^ 上标脚注）
 */
export function preprocessBilingualText(rawText: string): string {
  if (!rawText) return ''
  return rawText
    // 匹配 ^(3)^ 或 ^(abc)^ 形式的上标
    .replace(/\^\(([^\)]+)\)\^/g, '<sup class="bilingual-sup">($1)</sup>')
    // 匹配 ^3^ 形式的纯数字上标
    .replace(/\^(\d+)\^/g, '<sup class="bilingual-sup">$1</sup>')
    // 匹配 ^[3] 形式的引用角标
    .replace(/\^\[([^\]]+)\]/g, '<sup class="bilingual-sup">[$1]</sup>')
}

/**
 * 检查当前翻译文本是否为 Markdown 标题（例如 ## Section 1...）
 */
export function parseBilingualHeading(text: string): ParsedHeadingInfo {
  const trimmed = text.trim()
  const match = trimmed.match(/^(#{1,6})\s+(.+)$/s)
  if (match) {
    return {
      isHeading: true,
      level: match[1].length,
      headingText: match[2].trim(),
    }
  }
  return {
    isHeading: false,
    level: 0,
    headingText: trimmed,
  }
}

/**
 * 将翻译文本安全转换为出版级排版的 HTML 结构
 */
export function renderBilingualToHtml(rawText: string): string {
  if (!rawText) return ''
  const preprocessed = preprocessBilingualText(rawText)
  try {
    const parsed = marked.parse(preprocessed, {
      gfm: true,
      breaks: true,
    })
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    // 降级保底：若 marked 解析异常则返回基础文本
    return preprocessed
  }
}
