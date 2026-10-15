import type { ParagraphSentenceInfo } from '../types'
import { cleanTtsSpokenText } from '../helpers'

/**
 * 将朗读的段落按句子标点（。！？…等）进行分句索引，保持闭合引号与标点完整跟随
 */
export function indexParagraphSentences(fullPara: string): ParagraphSentenceInfo[] {
  const trimmed = (fullPara || '').trim()
  if (!trimmed) return []

  const regex = /[^。！？；…\n.!?]+(?:[。！？；…\n.!?]+["'”’」』]*|$)/g
  const matches: ParagraphSentenceInfo[] = []
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = regex.exec(trimmed)) !== null) {
    const raw = match[0].trim()
    if (raw) {
      matches.push({
        index: idx++,
        text: raw,
        cleanText: cleanTtsSpokenText(raw),
        startChar: match.index,
        endChar: match.index + match[0].length,
      })
    }
  }

  if (matches.length === 0 && trimmed) {
    matches.push({
      index: 0,
      text: trimmed,
      cleanText: cleanTtsSpokenText(trimmed),
      startChar: 0,
      endChar: trimmed.length,
    })
  }

  return matches
}

/**
 * 根据播放进度比例定位当前朗读句子信息
 */
export function computeActiveSentenceInfo(
  fullPara: string,
  progressRatio: number
): ParagraphSentenceInfo | null {
  const sentences = indexParagraphSentences(fullPara)
  if (sentences.length === 0) return null
  if (sentences.length === 1) return sentences[0]

  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0)
  const targetCharPos = Math.min(totalChars, Math.max(0, progressRatio * totalChars))
  let running = 0

  for (const s of sentences) {
    running += s.text.length
    if (running >= targetCharPos) {
      return s
    }
  }
  return sentences[sentences.length - 1]
}

/**
 * 在文本中查找当前朗读句子的精确起止字符索引区间
 */
export function findSentenceRangeInText(
  text: string,
  snippet: string
): { start: number; end: number } | null {
  if (!text || !snippet) return null

  const directIdx = text.indexOf(snippet)
  if (directIdx >= 0) {
    return { start: directIdx, end: directIdx + snippet.length }
  }

  const sentences = indexParagraphSentences(text)
  const cleanSnippet = cleanTtsSpokenText(snippet)

  for (const s of sentences) {
    if (
      s.text.includes(snippet) ||
      snippet.includes(s.text) ||
      (cleanSnippet && s.cleanText === cleanSnippet)
    ) {
      return { start: s.startChar, end: s.endChar }
    }
  }

  const trimmedSnippet = snippet.slice(0, Math.min(8, snippet.length))
  if (trimmedSnippet.length >= 3) {
    const fuzzyIdx = text.indexOf(trimmedSnippet)
    if (fuzzyIdx >= 0) {
      return { start: fuzzyIdx, end: Math.min(text.length, fuzzyIdx + snippet.length) }
    }
  }

  return null
}
