import type {
  PaginationInput,
  PageSliceItem,
  PageSpread,
  PaginationOutput,
  ParagraphSemanticStyle,
} from '../shared/types'
import {
  calculatePageLayoutMetrics,
  groupPagesIntoSpreads,
  layoutSingleParagraphItem,
  type ParagraphLayoutState,
} from './paginationWorkerHelpers'

export type {
  PaginationInput,
  PageSliceItem,
  PageSpread,
  PaginationOutput,
  ParagraphSemanticStyle,
}

export function computeSpreadsSync(input: Omit<PaginationInput, 'reqId'>): PageSpread[] {
  const {
    paragraphs,
    fontSize,
    lineHeight,
    pageWidth,
    firstLineIndent,
    bilingualMode,
    windowWidth,
    windowHeight,
    isSingleCol,
    pdfMode,
  } = input

  const isSingle = isSingleCol ?? (windowWidth < 1024)

  if (paragraphs.length === 0) {
    return [
      {
        left: [],
        right: [],
        leftPageNum: 1,
        rightPageNum: isSingle ? 1 : 2,
        totalPages: 1,
      },
    ]
  }

  const metrics = calculatePageLayoutMetrics(
    pageWidth,
    fontSize,
    lineHeight,
    windowWidth,
    windowHeight,
    isSingle
  )

  const state: ParagraphLayoutState = {
    currentPage: [],
    currentHeightPx: 48, // Reserve ~48px at top of Page 1 for chapter title
    singlePages: [],
  }

  for (let i = 0; i < paragraphs.length; i++) {
    layoutSingleParagraphItem(
      paragraphs[i],
      i,
      paragraphs[i + 1],
      metrics,
      firstLineIndent,
      bilingualMode,
      state,
      pdfMode
    )
  }

  if (state.currentPage.length > 0) {
    state.singlePages.push(state.currentPage)
  }

  return groupPagesIntoSpreads(state.singlePages, isSingle)
}

// In Web Worker context: listen to message events
if (
  typeof self !== 'undefined' &&
  'postMessage' in self &&
  typeof (self as any).window === 'undefined'
) {
  self.onmessage = (e: MessageEvent<PaginationInput>) => {
    const input = e.data
    const spreads = computeSpreadsSync(input)
    ;(self as any).postMessage({ reqId: input.reqId, spreads } as PaginationOutput)
  }
}
