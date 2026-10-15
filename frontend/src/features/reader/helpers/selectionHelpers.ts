import type { SelectionAnchorRect } from '../../reader-controls/types'
import { extractCleanSelectedText } from '../helpers'

function getTextOffsetWithinElement(root: Node, node: Node, offset: number): number {
  try {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.setEnd(node, offset)
    return range.toString().length
  } catch {
    return offset
  }
}

export function measureElementRect(el: HTMLElement | null): SelectionAnchorRect | null {
  if (!el) return null
  try {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      width: rect.width,
    }
  } catch {
    return null
  }
}

export function getSelectionDetails(
  fallbackChapterIndex: number,
  fallbackParagraphIndex = 0
): {
  text: string
  paragraphIndex: number
  endParagraphIndex?: number
  startOffset?: number
  endOffset?: number
  chapterIndex: number
  anchorRect: SelectionAnchorRect | null
} | null {
  if (typeof window === 'undefined') return null
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null

  const text = extractCleanSelectedText()
  if (!text || text.length < 2) return null

  let anchorRect: SelectionAnchorRect | null = null
  let pIdx = fallbackParagraphIndex
  let endPIdx = fallbackParagraphIndex
  let startOffset: number | undefined
  let endOffset: number | undefined
  let chIdx = fallbackChapterIndex

  try {
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect && (rect.width > 0 || rect.height > 0)) {
      anchorRect = {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
      }
    }

    const startNode = range.startContainer
    const startEl = (startNode instanceof Element ? startNode : startNode?.parentElement)?.closest('[data-para-index]')

    const endNode = range.endContainer
    const endEl = (endNode instanceof Element ? endNode : endNode?.parentElement)?.closest('[data-para-index]')

    if (!startEl && !endEl) return null

    if (startEl) {
      const pAttr = startEl.getAttribute('data-para-index')
      const cAttr = startEl.getAttribute('data-chapter-index')
      const sAttr = startEl.getAttribute('data-slice-start')
      if (pAttr !== null) pIdx = Number(pAttr)
      if (cAttr !== null) chIdx = Number(cAttr)
      const rawOffset = getTextOffsetWithinElement(startEl, range.startContainer, range.startOffset)
      startOffset = rawOffset !== undefined ? rawOffset + (sAttr !== null ? Number(sAttr) : 0) : undefined
    }

    if (endEl) {
      const pAttr = endEl.getAttribute('data-para-index')
      const sAttr = endEl.getAttribute('data-slice-start')
      if (pAttr !== null) endPIdx = Number(pAttr)
      const rawOffset = getTextOffsetWithinElement(endEl, range.endContainer, range.endOffset)
      endOffset = rawOffset !== undefined ? rawOffset + (sAttr !== null ? Number(sAttr) : 0) : undefined
    } else {
      endPIdx = pIdx
    }

    if (pIdx > endPIdx) {
      const tmpP = pIdx
      pIdx = endPIdx
      endPIdx = tmpP
      const tmpOff = startOffset
      startOffset = endOffset
      endOffset = tmpOff
    }
  } catch {
    // 忽略异常，使用降级值
  }

  return {
    text,
    paragraphIndex: pIdx,
    endParagraphIndex: endPIdx,
    startOffset,
    endOffset,
    chapterIndex: chIdx,
    anchorRect,
  }
}
