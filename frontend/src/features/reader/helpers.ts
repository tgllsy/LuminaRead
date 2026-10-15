import React from 'react'
import type { ParagraphSemanticStyle, ReaderTypography } from './types'
import { CIRCLED_NUMS, PAREN_NUMS } from './constants'

import {
  normalizeCitationKey,
  isRefDividerParagraph,
  parseFootnoteDefinition,
} from '../../shared/helpers/citationFootnoteHelpers'

export {
  normalizeCitationKey,
  isRefDividerParagraph,
  parseFootnoteDefinition,
}

export function extractFullFootnoteBody(paras: string[], defIdx: number): string {
  const firstDef = parseFootnoteDefinition(paras[defIdx] || '')
  if (!firstDef) return paras[defIdx] || ''
  const parts = [firstDef.body]
  for (let i = defIdx + 1; i < Math.min(paras.length, defIdx + 5); i++) {
    const nextPara = (paras[i] || '').trim()
    if (!nextPara) break
    if (parseFootnoteDefinition(nextPara) || isRefDividerParagraph(nextPara)) {
      break
    }
    parts.push(nextPara)
  }
  return parts.join('\n\n')
}

export function parsePdfPageMarker(paraText: string): number | null {
  const m = String(paraText || '')
    .trim()
    .match(/^\[\[PDF_PAGE:(\d+)\]\]$/)
  return m ? Number(m[1]) : null
}

export function parseBookImageMarker(paraText: string): string | null {
  const m = String(paraText || '')
    .trim()
    .match(/^\[\[BOOK_IMAGE:([^\]]+)\]\]$/)
  return m ? m[1].trim() : null
}

export { classifyParagraphTypography } from '../../shared/helpers/citationFootnoteHelpers'

export function getPdfFilterStyle(
  theme: ReaderTypography['theme'],
  eyeCareEnabled: boolean
): React.CSSProperties {
  if (!eyeCareEnabled) return {}
  if (theme === 'dark') {
    return { filter: 'invert(0.88) hue-rotate(180deg) contrast(1.06)' }
  }
  if (theme === 'parchment') {
    return { filter: 'sepia(0.22) brightness(0.97) contrast(1.02)', mixBlendMode: 'multiply' }
  }
  if (theme === 'sepia_green') {
    return { filter: 'sepia(0.15) hue-rotate(55deg) brightness(0.96)', mixBlendMode: 'multiply' }
  }
  if (theme === 'eink') {
    return { filter: 'contrast(1.04)' }
  }
  return {}
}

export function extractCleanSelectedText(): string {
  if (typeof window === 'undefined') return ''
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ''
  try {
    const frag = sel.getRangeAt(0).cloneContents()
    frag.querySelectorAll('.reader-ui-badge, button, sup').forEach((el) => el.remove())
    return (frag.textContent || '').trim()
  } catch {
    return sel.toString().trim()
  }
}

export function isTapTouch(
  touchStart: { x: number; y: number; time: number } | null,
  e: React.TouchEvent
): boolean {
  if (!touchStart || e.changedTouches.length === 0) return true
  const dx = Math.abs(e.changedTouches[0].clientX - touchStart.x)
  const dy = Math.abs(e.changedTouches[0].clientY - touchStart.y)
  const dt = Date.now() - touchStart.time
  return dx < 14 && dy < 14 && dt < 600
}

export function findCitationDefinition(
  paragraphs: string[],
  chapters: import('./types').BookChapter[],
  chapterIndex: number,
  rawMarker: string,
  sourceParaIdx: number,
  bibChapterIndex: number,
  currentChapterTitle: string
): import('./types').FootnoteModalState {
  const key = normalizeCitationKey(rawMarker)
  for (let i = 0; i < paragraphs.length; i++) {
    if (i === sourceParaIdx) continue
    const def = parseFootnoteDefinition(paragraphs[i])
    if (def && def.key === key) {
      return {
        rawMarker,
        key,
        footnoteText: extractFullFootnoteBody(paragraphs, i) || def.body,
        targetChapterIndex: chapterIndex,
        targetChapterTitle: currentChapterTitle,
        targetParagraphIndex: i,
        sourceParagraphIndex: sourceParaIdx,
        bibChapterIndex,
      }
    }
  }

  const maxAhead = Math.min(chapters.length - 1, chapterIndex + 22)
  for (let cIdx = chapterIndex + 1; cIdx <= maxAhead; cIdx++) {
    const chParas = String(chapters[cIdx]?.content || '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
    for (let pIdx = 0; pIdx < chParas.length; pIdx++) {
      const def = parseFootnoteDefinition(chParas[pIdx])
      if (def && def.key === key) {
        return {
          rawMarker,
          key,
          footnoteText: extractFullFootnoteBody(chParas, pIdx) || def.body,
          targetChapterIndex: cIdx,
          targetChapterTitle: chapters[cIdx]?.title || `第 ${cIdx + 1} 章`,
          targetParagraphIndex: pIdx,
          sourceParagraphIndex: sourceParaIdx,
          bibChapterIndex,
        }
      }
    }
  }

  const fallbackCh = bibChapterIndex >= 0 ? bibChapterIndex : chapterIndex
  return {
    rawMarker,
    key,
    footnoteText: `本章引用标记 ${rawMarker}，可跳转至章末或文献注释区并随时返回。`,
    targetChapterIndex: fallbackCh,
    targetChapterTitle: chapters[fallbackCh]?.title || currentChapterTitle,
    targetParagraphIndex: fallbackCh === chapterIndex ? Math.max(0, paragraphs.length - 1) : 0,
    sourceParagraphIndex: sourceParaIdx,
    bibChapterIndex,
  }
}

export function findCitationReferenceParagraph(
  paragraphs: string[],
  key: string
): number {
  const circled = CIRCLED_NUMS[Number(key) - 1] || ''
  const paren = PAREN_NUMS[Number(key) - 1] || ''
  const patterns = [`〔${key}〕`, `[${key}]`, `【${key}】`, `(${key})`, `（${key}）`, ...(circled ? [circled] : []), ...(paren ? [paren] : [])]
  for (let i = 0; i < paragraphs.length; i++) {
    if (!parseFootnoteDefinition(paragraphs[i]) && patterns.some((p) => paragraphs[i].includes(p))) {
      return i
    }
  }
  return -1
}

export * from './helpers/selectionHelpers'
export * from './helpers/paragraphStyleHelpers'
export * from './helpers/richTextHelpers'
export * from './helpers/publicationMarkerHelpers'
export * from './helpers/highlightRangeHelpers'

