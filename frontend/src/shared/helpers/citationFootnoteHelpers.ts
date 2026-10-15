import type { ParagraphSemanticStyle } from '../types'

export const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
export const PAREN_NUMS = ['⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼', '⑽', '⑾', '⑿', '⒀', '⒁', '⒂', '⒃', '⒄', '⒅', '⒆', '⒇']

export function normalizeCitationKey(rawMarker: string): string {
  const clean = String(rawMarker || '').trim()
  for (let i = 0; i < CIRCLED_NUMS.length; i++) {
    if (clean.includes(CIRCLED_NUMS[i])) return String(i + 1)
  }
  for (let i = 0; i < PAREN_NUMS.length; i++) {
    if (clean.includes(PAREN_NUMS[i])) return String(i + 1)
  }
  const digits = clean.match(/\d+/)
  return digits ? String(Number(digits[0])) : clean
}

export function isRefDividerParagraph(paraText: string): boolean {
  const trimmed = String(paraText || '').trim()
  if (!trimmed) return false
  if (/^(?:-{5,}|—{3,}|─{3,})$/.test(trimmed)) return true
  const compact = trimmed.replace(/[\s　]+/g, '')
  return /^【?(?:注释|参考文献|主要参考文献|尾注|注解|注释与参考文献|Notes:?|References:?|Bibliography:?)】?$/i.test(compact)
}

export function parseFootnoteDefinition(paraText: string): { badge: string; key: string; body: string } | null {
  const trimmed = String(paraText || '').trim()
  if (!trimmed) return null
  const m = trimmed.match(
    /^(?:(〔(?:注)?\d{1,3}〕+)|(\^?\[(?:(?:注)?\d{1,3}|[①-⑳])\])|(【(?:注)?\d{1,3}】)|([①-⑳⑴-⒇])|(\(注\d{1,3}\)|（注\d{1,3}）)|(\(\d{1,3}\)|（\d{1,3}）)[\s　]+)(.+)$/s
  )
  if (!m) return null
  const rawBadge = (m[1] || m[2] || m[3] || m[4] || m[5] || m[6] || '').trim()
  const badge = rawBadge.replace(/〕+$/, '〕').replace(/^\^/, '')
  const body = (m[7] || '').replace(/^[〕\]】\s　]+/, '').trim()
  if (!badge || !body) return null
  return { badge, key: normalizeCitationKey(badge), body }
}

function matchSpecialTypography(trimmed: string, nextParaText?: string): ParagraphSemanticStyle | null {
  if (
    trimmed.length <= 120 &&
    /^(?:图\s*\d+(?:[-—.．]\d+)?|表\s*\d+(?:[-—.．]\d+)?|附图\s*\d+|附表\s*\d+|专栏\s*\d+(?:[-—.．]\d+)?|数据来源[：:]|资料来源[：:]|图片来源[：:]|注[：:]\s*本[表图]|Figure\s+\d+|Table\s+\d+|Fig\.\s*\d+)/i.test(
      trimmed
    )
  ) {
    return 'caption'
  }
  if (/^(?:——|—{2,}|―{2,}|--\s*)[^—\n]{2,48}$/.test(trimmed)) {
    return 'attribution'
  }
  if (/^>\s+/.test(trimmed)) {
    return 'blockquote'
  }
  if (
    trimmed.length <= 220 &&
    nextParaText &&
    /^(?:——|—{2,}|―{2,}|--\s*)[^—\n]{2,48}$/.test(nextParaText.trim())
  ) {
    return 'blockquote'
  }
  if (
    trimmed.length <= 140 &&
    /^(?:ISBN\b|CIP\b|图书在版编目|责任编辑[：:]|封面设计[：:]|出版发行[：:]|印刷者?[：:]|版次[：:]|印次[：:]|字数[：:]|定价[：:]|书名[：:]|作者[：:]|译者[：:]|出版社[：:]|版权所有)/i.test(
      trimmed
    )
  ) {
    return 'meta_line'
  }
  if (
    trimmed.length <= 260 &&
    /^(?:[•·▪▫◦‣⁃*]\s+|\d{1,2}[.、．]\s+\S|[（(]\d{1,2}[)）]\s*\S|其[一二三四五六七八九十][，、])/u.test(
      trimmed
    )
  ) {
    return 'list_item'
  }
  return null
}

export function classifyParagraphTypography(
  paraText: string,
  nextParaText?: string
): { style: ParagraphSemanticStyle; cleanText: string } {
  const trimmed = String(paraText || '').trim()
  if (!trimmed) return { style: 'normal', cleanText: '' }

  if (/^(?:-{3,}|[*]{3,}|_{3,}|(?:[•*·]\s*){3,}|[─—]{2,5})$/.test(trimmed)) {
    return { style: 'divider', cleanText: trimmed }
  }

  if (/^```/.test(trimmed)) {
    const cleanCode = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim()
    return { style: 'code_block', cleanText: cleanCode }
  }

  const h1 = trimmed.match(/^#\s+(.+)$/)
  if (h1) return { style: 'heading_1', cleanText: h1[1].trim() }

  const h2 = trimmed.match(/^##\s+(.+)$/)
  if (h2) return { style: 'heading_2', cleanText: h2[1].trim() }

  const h3 = trimmed.match(/^###\s+(.+)$/)
  if (h3) return { style: 'heading_3', cleanText: h3[1].trim() }

  const h4 = trimmed.match(/^#{4,6}\s+(.+)$/)
  if (h4) return { style: 'subheading', cleanText: h4[1].trim() }

  if (trimmed.length <= 48 && !/[。！？；.!?;]$/.test(trimmed)) {
    if (/^第[一二三四五六七八九十百\d]+[卷部篇]\s*\S/.test(trimmed)) {
      return { style: 'heading_1', cleanText: trimmed }
    }
    if (/^第[一二三四五六七八九十百\d]+[章节]\s*\S/.test(trimmed)) {
      return { style: 'heading_2', cleanText: trimmed }
    }
    if (
      /^(?:[一二三四五六七八九十百]+[、.．\s]\s*\S|（[一二三四五六七八九十]+）\s*\S|\([一二三四五六七八九十]+\)\s*\S|第[一二三四五六七八九十百\d]+条\s*\S|(?:\d+|[A-Z])(?:\.\d+){1,3}\s+\S|【[^】]{2,24}】$)/.test(
        trimmed
      )
    ) {
      return { style: 'subheading', cleanText: trimmed }
    }
  }

  const matchedStyle = matchSpecialTypography(trimmed, nextParaText)
  if (matchedStyle) {
    const clean = matchedStyle === 'blockquote' && /^>\s+/.test(trimmed) ? trimmed.replace(/^>\s+/, '').trim() : trimmed
    return { style: matchedStyle, cleanText: clean }
  }

  return { style: 'normal', cleanText: trimmed }
}
