// 中文排版避头尾禁则与标点挤压辅助函数

/** 避头标点（禁止出现在行首 / 页首） */
export const NOT_AT_LINE_START = new Set([
  '。', '，', '、', '；', '：', '？', '！', '…', '—', '～',
  '”', '’', '）', '》', '】', '〕', '〉', '」', '』',
  '.', ',', '?', '!', ';', ':', ')', ']', '}', '"', '\'',
])

/** 避尾标点（禁止孤立留在行末 / 页末） */
export const NOT_AT_LINE_END = new Set([
  '“', '‘', '（', '《', '【', '〔', '〈', '「', '『',
  '(', '[', '{', '<',
])

/** CJK 标点符号正则 */
export const CJK_PUNCTUATION_REGEX = /[，。、；：？！“”‘’（）《》【】〔〕〈〉「」『』…—～]/

/**
 * 标点紧凑度补偿：计算文本的视觉宽度单位
 * 连续标点挤压为 0.55，单个 CJK 标点约 0.8，半角字符 0.55，普通汉字 1.0
 */
export function getVisualUnitsWithCompaction(text: string): number {
  let units = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code <= 127) {
      units += 0.55
    } else if (CJK_PUNCTUATION_REGEX.test(text[i])) {
      const nextChar = text[i + 1]
      units += nextChar && CJK_PUNCTUATION_REGEX.test(nextChar) ? 0.6 : 1.0
    } else {
      units += 1.0
    }
  }
  return units
}

/**
 * 依据避头尾禁则微调分页切分游标
 * @param text 剩余段落文字
 * @param fitChars 原定按度量切分的字数
 */
export function adjustPunctuationBoundary(text: string, fitChars: number): number {
  let adjusted = Math.min(text.length, Math.max(4, fitChars))
  if (adjusted >= text.length) return text.length

  // 1. 避头禁则：下一行/页首不能以避头标点（如句号、逗号、问号、闭括号）开头
  // 回退游标直到下一行首字为正文字符，从而将标点及其前置字符一并带到下一行
  while (adjusted > 4 && adjusted < text.length && NOT_AT_LINE_START.has(text[adjusted])) {
    adjusted--
  }

  // 2. 避尾禁则：当前行/页末不能孤立留下前引号、前书名号、前括号
  while (adjusted > 4 && NOT_AT_LINE_END.has(text[adjusted - 1])) {
    adjusted--
  }

  // 3. 避免行末留下未闭合的引用/注释序号标记（如 "[1" 或 "(2"）
  const tailSlice = text.slice(Math.max(0, adjusted - 6), adjusted)
  const bracketMatch = tailSlice.match(/[〔【\[（(]\d*$/)
  if (bracketMatch) {
    adjusted = Math.max(4, adjusted - bracketMatch[0].length)
  }

  return adjusted
}
