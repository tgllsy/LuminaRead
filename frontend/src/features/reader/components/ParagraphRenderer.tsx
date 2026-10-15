import React from 'react'
import type {
  PageSliceItem,
  ReaderTypography,
  HighlightItem,
  BookChapter,
  BookSummary,
} from '../types'
import {
  parsePdfPageMarker,
  parseBookImageMarker,
  parseTableMarker,
  parsePoetryMarker,
  parseBlockquoteMarker,
} from '../helpers'
import { PdfPageFigure, BookImageFigure } from './ParagraphMarkerFigures'
import { TableFigure, PoetryFigure, BlockquoteFigure } from './PublicationFigures'
import { ParagraphTextContent } from './ParagraphTextContent'

interface ParagraphRendererProps {
  item: number | PageSliceItem
  targetChIdx: number
  targetParas: string[]
  targetChapterObj: BookChapter
  targetChHighlights: HighlightItem[]
  typography: ReaderTypography
  book: BookSummary
  chapterIndex: number
  totalPdfPages: number
  pdfMode: string
  referenceDividerIdx: number
  isCurrentChapterReference: boolean
  highlightKeyword: string
  isListeningMode: boolean
  ttsActivePara: number | null
  flashedParaIndex: number | null
  focusedPara: { chapterIndex: number; paragraphIndex: number } | null
  bilingualMap: Record<number, string>
  touchStartRef: React.MutableRefObject<{ x: number; y: number; time: number } | null>
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  onOpenCitationMarker: (rawMarker: string, sourceParaIdx: number, sourceChapterIdx?: number) => void
  onJumpBackFromFootnoteDef: (key: string) => void
  onStartTtsAtParagraph: (chIdx: number, pIdx: number) => void
  onSelectHighlightForNote: (
    hl: HighlightItem,
    pIdx: number,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
  onTextMouseUp: (pIdx: number, chIdx: number) => void
  onOpenLightbox: (url: string, title: string, pageNum?: number) => void
  onSwitchPdfMode: (mode: 'hybrid' | 'page_canvas' | 'text_only') => void
  onSelectPdfCanvasPage: (pageNum: number) => void
  onOpenEntityWiki?: (
    term: string,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

export const ParagraphRenderer: React.FC<ParagraphRendererProps> = ({
  item, targetChIdx, targetParas, targetChapterObj, targetChHighlights, typography,
  book, chapterIndex, totalPdfPages, pdfMode, referenceDividerIdx,
  isCurrentChapterReference, highlightKeyword, isListeningMode, ttsActivePara,
  flashedParaIndex, focusedPara, bilingualMap, touchStartRef, paragraphRefs,
  onOpenCitationMarker, onJumpBackFromFootnoteDef, onStartTtsAtParagraph,
  onSelectHighlightForNote, onTextMouseUp, onOpenLightbox, onSwitchPdfMode,
  onSelectPdfCanvasPage, onOpenEntityWiki,
}) => {
  const pIdx = typeof item === 'number' ? item : item.pIdx
  const sliceStart = typeof item === 'number' ? undefined : item.sliceStart
  const sliceEnd = typeof item === 'number' ? undefined : item.sliceEnd
  const isContinuation = typeof item === 'number' ? false : Boolean(item.isContinuation)
  const itemKey = typeof item === 'number'
    ? `c-${targetChIdx}-p-${pIdx}`
    : `c-${targetChIdx}-p-${pIdx}-${sliceStart ?? 0}-${sliceEnd ?? 'end'}`

  const para = targetParas[pIdx]
  if (para === undefined) return null

  const pdfPageNum = parsePdfPageMarker(para)
  if (pdfPageNum !== null) {
    return (
      <PdfPageFigure
        book={book}
        pdfPageNum={pdfPageNum}
        totalPdfPages={totalPdfPages}
        pdfMode={pdfMode}
        itemKey={itemKey}
        pIdx={pIdx}
        onSwitchPdfMode={onSwitchPdfMode}
        onSelectPdfCanvasPage={onSelectPdfCanvasPage}
        onOpenLightbox={onOpenLightbox}
      />
    )
  }

  const bookImageUrl = parseBookImageMarker(para)
  if (bookImageUrl) {
    return (
      <BookImageFigure
        book={book}
        targetChapterObj={targetChapterObj}
        bookImageUrl={bookImageUrl}
        nextCap={targetParas[pIdx + 1] || ''}
        itemKey={itemKey}
        pIdx={pIdx}
        onOpenLightbox={onOpenLightbox}
      />
    )
  }

  // 出版物特殊排版标记解析 (表格、居中诗歌、独立引用块)
  const tableData = parseTableMarker(para)
  if (tableData) {
    return <TableFigure data={tableData} itemKey={itemKey} pIdx={pIdx} />
  }

  const poetryData = parsePoetryMarker(para)
  if (poetryData) {
    return <PoetryFigure data={poetryData} itemKey={itemKey} pIdx={pIdx} />
  }

  const blockquoteData = parseBlockquoteMarker(para)
  if (blockquoteData) {
    return <BlockquoteFigure data={blockquoteData} itemKey={itemKey} pIdx={pIdx} />
  }

  return (
    <ParagraphTextContent
      itemKey={itemKey}
      targetChIdx={targetChIdx}
      pIdx={pIdx}
      sliceStart={sliceStart}
      sliceEnd={sliceEnd}
      isContinuation={isContinuation}
      para={para}
      targetParas={targetParas}
      targetChHighlights={targetChHighlights}
      typography={typography}
      book={book}
      chapterIndex={chapterIndex}
      referenceDividerIdx={referenceDividerIdx}
      isCurrentChapterReference={isCurrentChapterReference}
      highlightKeyword={highlightKeyword}
      isListeningMode={isListeningMode}
      ttsActivePara={ttsActivePara}
      flashedParaIndex={flashedParaIndex}
      focusedPara={focusedPara}
      bilingualMap={bilingualMap}
      touchStartRef={touchStartRef}
      paragraphRefs={paragraphRefs}
      onOpenCitationMarker={onOpenCitationMarker}
      onJumpBackFromFootnoteDef={onJumpBackFromFootnoteDef}
      onStartTtsAtParagraph={onStartTtsAtParagraph}
      onSelectHighlightForNote={onSelectHighlightForNote}
      onTextMouseUp={onTextMouseUp}
      onOpenEntityWiki={onOpenEntityWiki}
    />
  )
}
