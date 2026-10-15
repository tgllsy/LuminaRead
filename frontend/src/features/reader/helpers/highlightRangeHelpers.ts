import type { HighlightItem } from '../types'

export interface ComputedHighlightSpan {
  hl: HighlightItem
  start: number
  end: number
}

/**
 * 针对指定段落计算该高亮在该段中的起止字符偏移 (支持单段与跨段落选区)
 */
export function computeHighlightSpanForParagraph(
  hl: HighlightItem,
  pIdx: number,
  plainText: string,
  sliceStart = 0
): ComputedHighlightSpan | null {
  if (!plainText) return null

  // 1. 尝试从 cfi_range 中解析跨段落范围 (例如 "p3:p5")
  let endPara = hl.end_paragraph_index
  if (endPara === undefined && hl.cfi_range) {
    const m = hl.cfi_range.match(/^p(\d+):p(\d+)$/)
    if (m) endPara = Number(m[2])
  }
  const isCrossParagraph = endPara !== undefined && endPara > hl.paragraph_index

  if (isCrossParagraph) {
    // 跨段落情况 1: 起始段落 (从 start 到段末)
    if (pIdx === hl.paragraph_index) {
      const firstLine = hl.selected_text.split(/\n/)[0]?.trim() || ''
      let start = firstLine && plainText.includes(firstLine) ? plainText.indexOf(firstLine) : -1
      if (start === -1) {
        const rawStart = hl.start_offset !== undefined && hl.start_offset >= 0 ? hl.start_offset : 0
        start = Math.max(0, rawStart - sliceStart)
      }
      return { hl, start: Math.min(start, plainText.length), end: plainText.length }
    }

    // 跨段落情况 2: 中间整段
    if (pIdx > hl.paragraph_index && pIdx < endPara!) {
      return { hl, start: 0, end: plainText.length }
    }

    // 跨段落情况 3: 结束段落 (从段首到 end)
    if (pIdx === endPara) {
      const lines = hl.selected_text.split(/\n/).map((l) => l.trim()).filter(Boolean)
      const lastLine = lines[lines.length - 1] || ''
      let end = lastLine && plainText.includes(lastLine)
        ? plainText.indexOf(lastLine) + lastLine.length
        : -1
      if (end === -1) {
        const rawEnd = hl.end_offset !== undefined && hl.end_offset > 0 ? hl.end_offset : plainText.length
        end = Math.max(0, Math.min(rawEnd - sliceStart, plainText.length))
      }
      return { hl, start: 0, end }
    }

    return null
  }

  // 2. 单段落选区匹配
  const text = hl.selected_text || ''
  if (text && plainText.includes(text)) {
    const start = plainText.indexOf(text)
    return { hl, start, end: start + text.length }
  }

  // 模糊回退 1: 尝试前缀 (最多 12 字符，修复旧代码将 end 截断为 prefix.length 的 bug)
  const prefix = text.slice(0, 12)
  if (prefix && plainText.includes(prefix)) {
    const start = plainText.indexOf(prefix)
    return { hl, start, end: Math.min(plainText.length, start + text.length) }
  }

  // 模糊回退 2: 尝试后缀 (最多 12 字符)
  if (text.length > 12) {
    const suffix = text.slice(-12)
    if (plainText.includes(suffix)) {
      const end = plainText.indexOf(suffix) + suffix.length
      const start = Math.max(0, end - text.length)
      return { hl, start, end }
    }
  }

  // 模糊回退 3: 中间子串匹配
  if (text.length > 20) {
    const midIdx = Math.floor(text.length / 2) - 7
    const midSub = text.slice(midIdx, midIdx + 14)
    if (plainText.includes(midSub)) {
      const matchIdx = plainText.indexOf(midSub)
      const start = Math.max(0, matchIdx - midIdx)
      const end = Math.min(plainText.length, start + text.length)
      return { hl, start, end }
    }
  }

  if (
    hl.paragraph_index === pIdx &&
    hl.start_offset !== undefined &&
    hl.end_offset !== undefined &&
    hl.end_offset > hl.start_offset
  ) {
    const start = Math.max(0, hl.start_offset - sliceStart)
    const end = Math.min(plainText.length, hl.end_offset - sliceStart)
    if (end > start && end > 0 && start < plainText.length) {
      return { hl, start, end }
    }
  }

  return null
}

export function filterHighlightsForParagraph(
  highlights: HighlightItem[],
  pIdx: number,
  paraText: string,
  targetParas: string[]
): HighlightItem[] {
  return highlights.filter((h) => {
    let endPara = h.end_paragraph_index
    if (endPara === undefined && h.cfi_range) {
      const m = h.cfi_range.match(/^p(\d+):p(\d+)$/)
      if (m) endPara = Number(m[2])
    }
    if (endPara !== undefined && endPara > h.paragraph_index) {
      return pIdx >= h.paragraph_index && pIdx <= endPara
    }
    const text = h.selected_text || ''
    if (text && paraText.includes(text)) {
      return h.paragraph_index === pIdx || !targetParas[h.paragraph_index]?.includes(text)
    }
    if (h.paragraph_index === pIdx) {
      const prefix = text.slice(0, 12)
      const suffix = text.length > 12 ? text.slice(-12) : ''
      return (
        (prefix.length >= 2 && paraText.includes(prefix)) ||
        (suffix.length >= 2 && paraText.includes(suffix)) ||
        (h.start_offset !== undefined && h.end_offset !== undefined && h.end_offset > h.start_offset)
      )
    }
    return false
  })
}
