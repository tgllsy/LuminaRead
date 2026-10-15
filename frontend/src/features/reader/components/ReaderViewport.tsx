import React from 'react'
import type {
  PageSpread,
  ReaderTypography,
  HighlightItem,
  BookChapter,
  BookSummary,
  PageSliceItem,
} from '../types'
import { ParagraphRenderer } from './ParagraphRenderer'
import { ReaderDualSpreadView } from './ReaderDualSpreadView'
import { ReaderContinuousScrollView } from './ReaderContinuousScrollView'
import { ReaderSinglePagedView } from './ReaderSinglePagedView'

interface ReaderViewportProps {
  effectiveLayoutMode: 'single' | 'dual'
  isContinuousSingleScroll: boolean
  typography: ReaderTypography
  book: BookSummary
  chapters: BookChapter[]
  chapterIndex: number
  currentChapter: BookChapter
  connectedChapterIndices: number[]
  paragraphs: string[]
  paginatedSpreads: PageSpread[]
  clampedSpreadIndex: number
  progressPercent: number
  chapterHighlights: HighlightItem[]
  highlights: HighlightItem[]
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
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>
  chapterStreamRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  touchStartRef: React.MutableRefObject<{ x: number; y: number; time: number } | null>
  onSelectChapter: (nextIdx: number) => void
  onPageTurnScreen: (direction: 'prev' | 'next') => void
  onAppendNextContinuousChapter: () => void
  onOpenCitationMarker: (rawMarker: string, sourceParaIdx: number, sourceChapterIdx?: number) => void
  onJumpBackFromFootnoteDef: (key: string) => void
  onStartTtsAtParagraph: (chIdx: number, pIdx: number) => void
  onSelectHighlightForNote: (
    hl: HighlightItem,
    pIdx: number,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
  onTextMouseUp: (pIdx: number, chIdx?: number) => void
  onOpenLightbox: (url: string, title: string, pageNum?: number) => void
  onSwitchPdfMode: (mode: 'hybrid' | 'page_canvas' | 'text_only') => void
  onSelectPdfCanvasPage: (pageNum: number) => void
  readingEstimateText?: string
  onOpenEntityWiki?: (
    term: string,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

export const ReaderViewport: React.FC<ReaderViewportProps> = ({
  effectiveLayoutMode,
  isContinuousSingleScroll,
  typography,
  book,
  chapters,
  chapterIndex,
  currentChapter,
  connectedChapterIndices,
  paragraphs,
  paginatedSpreads,
  clampedSpreadIndex,
  progressPercent,
  readingEstimateText,
  chapterHighlights,
  highlights,
  totalPdfPages,
  pdfMode,
  referenceDividerIdx,
  isCurrentChapterReference,
  highlightKeyword,
  isListeningMode,
  ttsActivePara,
  flashedParaIndex,
  focusedPara,
  bilingualMap,
  bottomSentinelRef,
  chapterStreamRefs,
  paragraphRefs,
  touchStartRef,
  onSelectChapter,
  onPageTurnScreen,
  onAppendNextContinuousChapter,
  onOpenCitationMarker,
  onJumpBackFromFootnoteDef,
  onStartTtsAtParagraph,
  onSelectHighlightForNote,
  onTextMouseUp,
  onOpenLightbox,
  onSwitchPdfMode,
  onSelectPdfCanvasPage,
  onOpenEntityWiki,
}) => {
  const renderParagraph = (
    item: number | PageSliceItem,
    targetChIdx: number,
    overrideParas?: string[]
  ) => {
    const targetParas = overrideParas ?? (targetChIdx === chapterIndex ? paragraphs : String(chapters[targetChIdx]?.content || '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean))
    const targetChapterObj = chapters[targetChIdx] || currentChapter
    const targetChHighlights =
      targetChIdx === chapterIndex
        ? chapterHighlights
        : highlights.filter((h) => h.chapter_index === targetChIdx)

    return (
      <ParagraphRenderer
        key={typeof item === 'number' ? `p-${targetChIdx}-${item}` : `sp-${item.pIdx}-${item.sliceStart}`}
        item={item}
        targetChIdx={targetChIdx}
        targetParas={targetParas}
        targetChapterObj={targetChapterObj}
        targetChHighlights={targetChHighlights}
        typography={typography}
        book={book}
        chapterIndex={chapterIndex}
        totalPdfPages={totalPdfPages}
        pdfMode={pdfMode}
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
        onTextMouseUp={(p, ch) => onTextMouseUp(p, ch)}
        onOpenLightbox={onOpenLightbox}
        onSwitchPdfMode={onSwitchPdfMode}
        onSelectPdfCanvasPage={onSelectPdfCanvasPage}
        onOpenEntityWiki={onOpenEntityWiki}
      />
    )
  }

  if (effectiveLayoutMode === 'dual') {
    return (
      <ReaderDualSpreadView
        typography={typography}
        book={book}
        chapters={chapters}
        chapterIndex={chapterIndex}
        currentChapter={currentChapter}
        paginatedSpreads={paginatedSpreads}
        clampedSpreadIndex={clampedSpreadIndex}
        progressPercent={progressPercent}
        readingEstimateText={readingEstimateText}
        onPageTurnScreen={onPageTurnScreen}
        onSelectChapter={onSelectChapter}
        onSwitchPdfMode={onSwitchPdfMode}
        renderParagraph={(item, targetChIdx) => renderParagraph(item, targetChIdx)}
      />
    )
  }

  if (!isContinuousSingleScroll) {
    return (
      <ReaderSinglePagedView
        typography={typography}
        book={book}
        chapters={chapters}
        chapterIndex={chapterIndex}
        currentChapter={currentChapter}
        paginatedSpreads={paginatedSpreads}
        clampedSpreadIndex={clampedSpreadIndex}
        progressPercent={progressPercent}
        readingEstimateText={readingEstimateText}
        onPageTurnScreen={onPageTurnScreen}
        onSelectChapter={onSelectChapter}
        onSwitchPdfMode={onSwitchPdfMode}
        renderParagraph={(item, targetChIdx) => renderParagraph(item, targetChIdx)}
      />
    )
  }

  return (
    <ReaderContinuousScrollView
      typography={typography}
      chapters={chapters}
      chapterIndex={chapterIndex}
      currentChapter={currentChapter}
      connectedChapterIndices={connectedChapterIndices}
      paragraphs={paragraphs}
      isContinuousSingleScroll={isContinuousSingleScroll}
      progressPercent={progressPercent}
      readingEstimateText={readingEstimateText}
      bottomSentinelRef={bottomSentinelRef}
      chapterStreamRefs={chapterStreamRefs}
      onSelectChapter={onSelectChapter}
      onAppendNextContinuousChapter={onAppendNextContinuousChapter}
      renderParagraph={(pIdx, streamChIdx, streamParas) => renderParagraph(pIdx, streamChIdx, streamParas)}
    />
  )
}
