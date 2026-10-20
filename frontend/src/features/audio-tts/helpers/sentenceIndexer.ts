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
    const isCompleteSentence = /[。！？；…!?;]["'”’」』]*$/.test(s.text)
    if (
      s.text === snippet ||
      (cleanSnippet && s.cleanText === cleanSnippet) ||
      (snippet.length >= 4 && s.text.includes(snippet)) ||
      (!isCompleteSentence && s.text.length >= 4 && snippet.includes(s.text))
    ) {
      return { start: s.startChar, end: s.endChar }
    }
  }

  const trimmedSnippet = snippet.slice(0, Math.min(8, snippet.length))
  if (trimmedSnippet.length >= 4) {
    const fuzzyIdx = text.indexOf(trimmedSnippet)
    if (fuzzyIdx >= 0) {
      return { start: fuzzyIdx, end: Math.min(text.length, fuzzyIdx + snippet.length) }
    }
  }

  return null
}

/**
 * 根据段落整体播放比率计算当前活跃句以及在当前句内部的相对进度比例 (0.0 ~ 1.0)
 */
export function computeSentenceProgress(
  fullPara: string,
  progressRatio: number
): { activeSentence: string; sentenceProgress: number; sentenceIndex: number } {
  const sentences = indexParagraphSentences(fullPara)
  if (sentences.length === 0) {
    return { activeSentence: fullPara, sentenceProgress: progressRatio, sentenceIndex: 0 }
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0)
  if (totalChars === 0) {
    return { activeSentence: sentences[0].text, sentenceProgress: 0, sentenceIndex: 0 }
  }

  const clampedRatio = Math.max(0, Math.min(1, progressRatio))
  const targetCharPos = clampedRatio * totalChars

  let running = 0
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]
    const nextRunning = running + s.text.length
    if (targetCharPos <= nextRunning || i === sentences.length - 1) {
      const sentenceChars = Math.max(1, s.text.length)
      const inSentencePos = targetCharPos - running
      const sentenceProgress = Math.max(0, Math.min(1, inSentencePos / sentenceChars))
      return {
        activeSentence: s.text,
        sentenceProgress,
        sentenceIndex: i,
      }
    }
    running = nextRunning
  }

  const last = sentences[sentences.length - 1]
  return { activeSentence: last.text, sentenceProgress: 1, sentenceIndex: sentences.length - 1 }
}
