import type { PageLayoutMetrics, PageSliceItem, PageSpread, ParagraphSemanticStyle } from '../shared/types'
import {
  normalizeCitationKey,
  parseFootnoteDefinition,
  isRefDividerParagraph,
  classifyParagraphTypography,
} from './citationFootnoteHelpers'
export { normalizeCitationKey, isRefDividerParagraph, parseFootnoteDefinition, classifyParagraphTypography }
import { getVisualUnitsWithCompaction, adjustPunctuationBoundary, CJK_PUNCTUATION_REGEX } from './punctuationHelpers'
import {
  parseTableMarker,
  parsePoetryMarker,
  parseBlockquoteMarker,
} from '../shared/helpers/publicationMarkerHelpers'

export function getVisualCharUnits(text: string): number {
  return getVisualUnitsWithCompaction(text)
}

export function findSliceCharCount(text: string, targetVisualUnits: number): number {
  let units = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    let charUnit = 1.0
    if (code <= 127) {
      charUnit = 0.55
    } else if (CJK_PUNCTUATION_REGEX.test(text[i])) {
      const nextChar = text[i + 1]
      charUnit = nextChar && CJK_PUNCTUATION_REGEX.test(nextChar) ? 0.6 : 1.0
    }
    if (units + charUnit > targetVisualUnits) {
      return Math.max(1, i)
    }
    units += charUnit
  }
  return text.length
}

export function calculatePageLayoutMetrics(
  pageWidth: number,
  fontSize: number,
  lineHeight: number,
  windowWidth: number,
  windowHeight: number,
  isSingleCol = false
): PageLayoutMetrics {
  const isXl = windowWidth >= 1280
  const dualCardWidth = Math.min(windowWidth - 48, Math.max(960, pageWidth + 200))
  const dualPad = isXl ? 144 : 96
  const singleColWidthPx = isSingleCol
    ? (windowWidth < 640
        ? Math.max(260, windowWidth - 40)
        : Math.max(280, Math.min(windowWidth - 56, pageWidth) - 72))
    : Math.max(280, Math.floor((dualCardWidth - dualPad) / 2) - 4)
  const charWidthPx = fontSize * 1.01
  const charsPerLine = Math.max(12, Math.floor(singleColWidthPx / charWidthPx))
  const lineHeightPx = fontSize * lineHeight
  const paraGapPx = 12
  const colBodyHeightPx = Math.max(240, windowHeight - (isSingleCol ? 164 : 260))
  return { dualCardWidth, singleColWidthPx, charsPerLine, lineHeightPx, paraGapPx, colBodyHeightPx }
}

export function isPdfPageMarker(trimmed: string): boolean {
  return /^\[\[PDF_PAGE:\d+\]\]$/i.test(trimmed)
}

export function isImageParagraph(trimmed: string): boolean {
  return isPdfPageMarker(trimmed) || /^\[\[BOOK_IMAGE:[^\]]+\]\]$/i.test(trimmed)
}

export interface SpecialBlockParams {
  isImg: boolean
  isPdfPage?: boolean
  pdfMode?: string
  trimmedLen: number
  style: ParagraphSemanticStyle
  firstLineIndent?: boolean
  charsPerLine: number
  lineHeightPx: number
  paraGapPx: number
  bilingualMode?: boolean
  tableRows?: number
  poetryLines?: number
  isBlockquote?: boolean
}

export function computeSpecialBlockHeight(params: SpecialBlockParams): number {
  const { isImg, isPdfPage, pdfMode, trimmedLen, style, firstLineIndent, charsPerLine, lineHeightPx, paraGapPx, bilingualMode, tableRows, poetryLines, isBlockquote } = params
  if (isImg) {
    if (isPdfPage && pdfMode === 'text_only') return lineHeightPx + paraGapPx + 12
    return 8 * lineHeightPx + paraGapPx
  }
  if (tableRows !== undefined) return (tableRows + 2) * 36 + paraGapPx + 16
  if (poetryLines !== undefined) return (poetryLines + 1) * (lineHeightPx + 6) + paraGapPx + 24
  if (isBlockquote) {
    const lines = Math.max(1, Math.ceil(trimmedLen / charsPerLine))
    return lines * lineHeightPx + paraGapPx + 28
  }
  const indentChars = style === 'normal' && firstLineIndent !== false ? 2 : 0
  const lines = Math.max(1, Math.ceil((trimmedLen + indentChars) / charsPerLine))
  let blockPx = lines * lineHeightPx + paraGapPx + (style === 'subheading' ? 22 : 0)
  if (bilingualMode) {
    const bilingualLines = Math.max(2, Math.ceil(lines * 1.15))
    blockPx += Math.round(bilingualLines * (lineHeightPx * 0.95)) + 40
  }
  return blockPx
}

export interface SlicingParams {
  fullText: string
  pIdx: number
  firstLineIndent?: boolean
  metrics: PageLayoutMetrics
  currentPage: PageSliceItem[]
  currentHeightPx: number
  singlePages: PageSliceItem[][]
  bilingualMode?: boolean
}

function computeFitSliceEnd(
  remainingText: string,
  targetUnits: number,
  sliceCursor: number,
  fullTextLen: number
): number {
  let fitChars = findSliceCharCount(remainingText, targetUnits)
  fitChars = adjustPunctuationBoundary(remainingText, fitChars)
  return Math.min(fullTextLen, Math.max(sliceCursor + 1, sliceCursor + fitChars))
}

export function sliceParagraphIntoPages(params: SlicingParams): {
  currentPage: PageSliceItem[]
  currentHeightPx: number
} {
  const { fullText, pIdx, firstLineIndent, metrics, singlePages, bilingualMode } = params
  const { charsPerLine, lineHeightPx, paraGapPx, colBodyHeightPx } = metrics
  const effectiveLineHeight = bilingualMode ? Math.round(lineHeightPx * 1.65) : lineHeightPx
  let currentPage = params.currentPage
  let currentHeightPx = params.currentHeightPx
  let sliceCursor = 0
  let isCont = false
  const safetyMargin = Math.max(44, Math.round(effectiveLineHeight * 1.35))

  while (sliceCursor < fullText.length) {
    const remainingText = fullText.slice(sliceCursor)
    const indentUnits = !isCont && firstLineIndent !== false ? 2 : 0
    const remainingUnits = getVisualCharUnits(remainingText) + indentUnits
    const linesNeeded = Math.max(1, Math.ceil(remainingUnits / charsPerLine))
    const neededPx = linesNeeded * effectiveLineHeight + paraGapPx
    const availPx = colBodyHeightPx - currentHeightPx

    if (neededPx <= availPx - safetyMargin) {
      currentPage.push({
        pIdx,
        ...(sliceCursor > 0 || isCont ? { sliceStart: sliceCursor, isContinuation: isCont } : {}),
      })
      currentHeightPx += neededPx
      break
    }

    const availLines = Math.max(0, Math.floor((availPx - safetyMargin) / effectiveLineHeight))

    if (availLines >= 1) {
      const targetUnits = Math.max(8, availLines * charsPerLine - indentUnits)
      const sliceEnd = computeFitSliceEnd(remainingText, targetUnits, sliceCursor, fullText.length)
      const slicedText = fullText.slice(sliceCursor, sliceEnd)
      const slicedUnits = getVisualCharUnits(slicedText) + indentUnits
      const remainingTail = fullText.slice(sliceEnd)
      const tailUnits = getVisualCharUnits(remainingTail)

      if (remainingTail.length > 0 && remainingTail.length <= 4 && slicedUnits + tailUnits <= availLines * charsPerLine) {
        currentPage.push({
          pIdx,
          ...(sliceCursor > 0 || isCont ? { sliceStart: sliceCursor, isContinuation: isCont } : {}),
        })
        currentHeightPx += availLines * effectiveLineHeight + paraGapPx
        break
      }

      currentPage.push({ pIdx, sliceStart: sliceCursor, sliceEnd, isContinuation: isCont })
      singlePages.push(currentPage)
      currentPage = []
      currentHeightPx = 0
      sliceCursor = sliceEnd
      isCont = true
    } else {
      if (currentPage.length > 0) {
        singlePages.push(currentPage)
        currentPage = []
        currentHeightPx = 0
      } else {
        const sliceEnd = computeFitSliceEnd(remainingText, Math.max(8, charsPerLine - indentUnits), sliceCursor, fullText.length)
        currentPage.push({ pIdx, sliceStart: sliceCursor, sliceEnd, isContinuation: isCont })
        singlePages.push(currentPage)
        currentPage = []
        currentHeightPx = 0
        sliceCursor = sliceEnd
        isCont = true
      }
    }
  }

  return { currentPage, currentHeightPx }
}

export function groupPagesIntoSpreads(singlePages: PageSliceItem[][], isSingleCol = false): PageSpread[] {
  const totalPages = Math.max(1, singlePages.length)
  const spreads: PageSpread[] = []
  const step = isSingleCol ? 1 : 2
  for (let s = 0; s < singlePages.length; s += step) {
    spreads.push({
      left: singlePages[s] || [],
      right: isSingleCol ? [] : (singlePages[s + 1] || []),
      leftPageNum: s + 1,
      rightPageNum: isSingleCol ? s + 1 : s + 2,
      totalPages,
    })
  }
  return spreads
}

export interface ParagraphLayoutState {
  currentPage: PageSliceItem[]
  currentHeightPx: number
  singlePages: PageSliceItem[][]
}

export function layoutSingleParagraphItem(
  p: string,
  i: number,
  nextP: string | undefined,
  metrics: PageLayoutMetrics,
  firstLineIndent: boolean | undefined,
  bilingualMode: boolean | undefined,
  state: ParagraphLayoutState,
  pdfMode?: string
): void {
  const trimmed = p.trim()
  const isPdfPage = isPdfPageMarker(trimmed)
  const isImg = isImageParagraph(trimmed)
  const fnDef = parseFootnoteDefinition(p)
  const isRefDiv = isRefDividerParagraph(p)
  const sem = !fnDef && !isRefDiv ? classifyParagraphTypography(p, nextP) : { style: 'normal' as ParagraphSemanticStyle, cleanText: p }
  const tableData = parseTableMarker(p)
  const poetryData = parsePoetryMarker(p)
  const blockquoteData = parseBlockquoteMarker(p)

  const isAtomic = isImg || Boolean(tableData) || Boolean(poetryData)
  const isSpecial = isAtomic || Boolean(fnDef) || isRefDiv || Boolean(blockquoteData) || sem.style !== 'normal' || Boolean(bilingualMode)

  if (isSpecial) {
    const blockPx = computeSpecialBlockHeight({
      isImg, isPdfPage, pdfMode, trimmedLen: trimmed.length, style: sem.style, firstLineIndent,
      charsPerLine: metrics.charsPerLine, lineHeightPx: metrics.lineHeightPx, paraGapPx: metrics.paraGapPx,
      bilingualMode, tableRows: tableData ? tableData.rows.length + 1 : undefined,
      poetryLines: poetryData ? poetryData.lines.length + (poetryData.title ? 1 : 0) : undefined,
      isBlockquote: Boolean(blockquoteData),
    })

    const maxPageHeight = metrics.colBodyHeightPx - Math.max(44, Math.round(metrics.lineHeightPx * 1.35))

    // If atomic block or fits within page, place as whole block
    if (isAtomic || blockPx <= maxPageHeight) {
      if (state.currentPage.length > 0 && state.currentHeightPx + blockPx > maxPageHeight) {
        state.singlePages.push(state.currentPage)
        state.currentPage = [{ pIdx: i }]
        state.currentHeightPx = blockPx
      } else {
        state.currentPage.push({ pIdx: i })
        state.currentHeightPx += blockPx
      }
      return
    }
  }

  // Text paragraph or overflowing non-atomic special block: slice across pages
  const res = sliceParagraphIntoPages({
    fullText: sem.cleanText || p,
    pIdx: i,
    firstLineIndent,
    metrics,
    currentPage: state.currentPage,
    currentHeightPx: state.currentHeightPx,
    singlePages: state.singlePages,
    bilingualMode,
  })
  state.currentPage = res.currentPage
  state.currentHeightPx = res.currentHeightPx
}

