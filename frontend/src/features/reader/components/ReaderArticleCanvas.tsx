import React from 'react'
import { Eye } from 'lucide-react'
import type {
  BookSummary,
  BookChapter,
  PdfBookMeta,
  PdfMode,
  PdfSpreadMode,
  ReaderTypography,
  HighlightItem,
  PageSpread,
  ReturnAnchorState,
} from '../types'
import { FONT_FAMILY_MAP } from '../constants'
import { PdfViewport } from './PdfViewport'
import { ReaderViewport } from './ReaderViewport'
import { useTtsReadingFollow } from '../hooks'

export interface ReaderArticleCanvasProps {
  articleRef: React.RefObject<HTMLDivElement | null>
  onCanvasClick: (e: React.MouseEvent) => void
  onSpreadWheel: (e: React.WheelEvent) => void
  onTouchStartCapture: (e: React.TouchEvent<HTMLElement>) => void
  onTouchEnd: (e: React.TouchEvent<HTMLElement>) => void
  book: BookSummary
  pdfMode: PdfMode
  effectiveLayoutMode: 'single' | 'dual'
  typography: ReaderTypography
  isDualSpread: boolean
  themeStyle: { page: string; subtext: string }
  fontClass: string
  chapters: BookChapter[]
  chapterIndex: number
  currentChapter: BookChapter
  isContinuousSingleScroll: boolean
  connectedChapterIndices: number[]
  returnAnchor: ReturnAnchorState | null
  onReturnAnchorClick: () => void
  pdfEyeCareFilter: boolean
  onTogglePdfEyeCareFilter: () => void
  onSwitchPdfMode: (mode: PdfMode) => void
  onSelectPdfCanvasPage: (pageNum: number) => void
  pdfCanvasPage: number
  pdfMeta: PdfBookMeta | null
  totalPdfPages: number
  pdfSpreadMode: PdfSpreadMode
  pdfZoom: number
  pdfFilterStyle: React.CSSProperties
  paragraphs: string[]
  chapterHighlights: HighlightItem[]
  highlights: HighlightItem[]
  paginatedSpreads: PageSpread[]
  clampedSpreadIndex: number
  progressPercent: number
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
  onSetPdfSpreadMode: (mode: PdfSpreadMode) => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onJumpToPdfPage: (page: number) => void
  readingEstimateText?: string
  onOpenEntityWiki?: (
    term: string,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

export const ReaderArticleCanvas: React.FC<ReaderArticleCanvasProps> = ({
  articleRef, onCanvasClick, onSpreadWheel, onTouchStartCapture, onTouchEnd,
  book, pdfMode, effectiveLayoutMode, typography, isDualSpread, themeStyle, fontClass,
  chapters, chapterIndex, currentChapter, isContinuousSingleScroll, connectedChapterIndices,
  returnAnchor, onReturnAnchorClick, pdfEyeCareFilter, onTogglePdfEyeCareFilter,
  onSwitchPdfMode, onSelectPdfCanvasPage, pdfCanvasPage, pdfMeta, totalPdfPages,
  pdfSpreadMode, pdfZoom, pdfFilterStyle, paragraphs, chapterHighlights, highlights,
  paginatedSpreads, clampedSpreadIndex, progressPercent, readingEstimateText, referenceDividerIdx,
  isCurrentChapterReference, highlightKeyword, isListeningMode, ttsActivePara,
  flashedParaIndex, focusedPara, bilingualMap, bottomSentinelRef, chapterStreamRefs,
  paragraphRefs, touchStartRef, onSelectChapter, onPageTurnScreen,
  onAppendNextContinuousChapter, onOpenCitationMarker, onJumpBackFromFootnoteDef,
  onStartTtsAtParagraph, onSelectHighlightForNote, onTextMouseUp, onOpenLightbox,
  onSetPdfSpreadMode, onSetPdfZoom, onJumpToPdfPage, onOpenEntityWiki,
}) => {
  useTtsReadingFollow({
    activeBookId: book.id,
    chapterIndex,
    ttsActivePara,
    paragraphRefs,
    isContinuousSingleScroll,
  })

  const isPageCanvas = book.format === 'pdf' && pdfMode === 'page_canvas'
  const maxWidth = isPageCanvas
    ? '1240px'
    : effectiveLayoutMode === 'dual'
    ? `${Math.max(960, typography.pageWidth + 200)}px`
    : `${typography.pageWidth}px`

  const firstStreamCh = chapters[connectedChapterIndices[0]] || currentChapter
  const firstParaRaw = (
    connectedChapterIndices[0] === chapterIndex
      ? paragraphs[0]
      : String(firstStreamCh?.content || '').split(/\n{2,}|\n/)[0]
  ) || ''
  const normChTitle = (firstStreamCh?.title || '').replace(/^#{1,6}\s*/, '').replace(/\s+/g, '')
  const normFirstPara = firstParaRaw.trim().replace(/^#{1,6}\s*/, '').replace(/\s+/g, '')
  const hasInlineChapterHeading =
    firstParaRaw.trim().startsWith('#') &&
    normChTitle.length > 0 &&
    (normFirstPara === normChTitle || normFirstPara.includes(normChTitle) || normChTitle.includes(normFirstPara))
  const showTopCanvasHeader = !isDualSpread && isContinuousSingleScroll && (!hasInlineChapterHeading || Boolean(returnAnchor) || book.format === 'pdf')

  return (
    <article
      ref={articleRef}
      onClick={onCanvasClick}
      onWheel={onSpreadWheel}
      onTouchStartCapture={onTouchStartCapture}
      onTouchEnd={onTouchEnd}
      style={{ maxWidth, fontFamily: FONT_FAMILY_MAP[typography.fontFamily], lineHeight: typography.lineHeight }}
      className={`reader-article-canvas w-full transition-all relative cursor-pointer select-text ${
        isDualSpread
          ? 'h-full flex flex-col justify-between rounded-3xl border px-8 xl:px-12 py-4 sm:py-5 overflow-hidden'
          : isPageCanvas
          ? 'min-h-[calc(100dvh-2.25rem)] sm:min-h-0 rounded-none sm:rounded-3xl border-0 sm:border px-2 sm:px-6 py-2 sm:py-4 pb-20 sm:pb-28'
          : !isContinuousSingleScroll
          ? 'h-[calc(100dvh-2.25rem)] sm:h-[calc(100vh-3.5rem)] flex flex-col justify-between rounded-none sm:rounded-3xl border-0 sm:border px-4 py-3 sm:px-8 sm:py-6 overflow-hidden'
          : 'min-h-[calc(100dvh-2.25rem)] sm:min-h-0 rounded-none sm:rounded-3xl border-0 sm:border px-5 py-5 sm:p-10 md:p-14'
      } ${themeStyle.page} ${fontClass}`}
    >
      {isDualSpread && (
        <div className="hidden lg:block absolute inset-y-5 left-1/2 w-px bg-current/10 pointer-events-none" />
      )}

      {showTopCanvasHeader && (
        <div className="mb-6 sm:mb-9 pb-3 border-b border-current/8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!hasInlineChapterHeading && (
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
                {firstStreamCh?.title || currentChapter.title}
              </h1>
            )}
            {returnAnchor && (
              <button
                type="button"
                data-no-hud-toggle="true"
                onClick={(e) => {
                  e.stopPropagation()
                  onReturnAnchorClick()
                }}
                className="reader-ui-badge px-3 py-1 rounded-full bg-[#1b88ee] text-white text-xs font-medium flex items-center gap-1 shadow-xs"
              >
                <span>↩ 返回 ({returnAnchor.label})</span>
              </button>
            )}
          </div>

          {book.format === 'pdf' && (
            <div
              data-no-hud-toggle="true"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-2xl border border-current/10 bg-current/[0.02] flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'hybrid', label: '图文融合' },
                    { id: 'page_canvas', label: '原版书页' },
                    { id: 'text_only', label: '纯文本重排' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (
                        m.id === 'page_canvas' &&
                        currentChapter.pageStart &&
                        currentChapter.pageEnd &&
                        (pdfCanvasPage < currentChapter.pageStart || pdfCanvasPage > currentChapter.pageEnd)
                      ) {
                        onSelectPdfCanvasPage(currentChapter.pageStart)
                      }
                      onSwitchPdfMode(m.id)
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      pdfMode === m.id ? 'bg-[#1b88ee] text-white' : 'bg-current/5 hover:bg-current/10 opacity-75'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onTogglePdfEyeCareFilter}
                className="px-2.5 py-1 rounded-full text-xs opacity-75 hover:opacity-100 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{pdfEyeCareFilter ? '护眼滤镜' : '原色'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isPageCanvas ? (
        <PdfViewport
          book={book}
          pdfMeta={pdfMeta}
          pdfCanvasPage={pdfCanvasPage}
          totalPdfPages={totalPdfPages}
          pdfSpreadMode={pdfSpreadMode}
          pdfZoom={pdfZoom}
          pdfFilterStyle={pdfFilterStyle}
          paragraphs={paragraphs}
          chapterHighlights={chapterHighlights}
          typography={typography}
          themeStyle={themeStyle}
          fontClass={fontClass}
          onJumpToPdfPage={onJumpToPdfPage}
          onSetPdfSpreadMode={onSetPdfSpreadMode}
          onSetPdfZoom={onSetPdfZoom}
          onOpenLightbox={(u, t, p) => onOpenLightbox(u, t, p)}
          onTextMouseUp={onTextMouseUp}
        />
      ) : (
        <ReaderViewport
          effectiveLayoutMode={effectiveLayoutMode}
          isContinuousSingleScroll={isContinuousSingleScroll}
          typography={typography}
          book={book}
          chapters={chapters}
          chapterIndex={chapterIndex}
          currentChapter={currentChapter}
          connectedChapterIndices={connectedChapterIndices}
          paragraphs={paragraphs}
          paginatedSpreads={paginatedSpreads}
          clampedSpreadIndex={clampedSpreadIndex}
          progressPercent={progressPercent}
          readingEstimateText={readingEstimateText}
          chapterHighlights={chapterHighlights}
          highlights={highlights}
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
          bottomSentinelRef={bottomSentinelRef}
          chapterStreamRefs={chapterStreamRefs}
          paragraphRefs={paragraphRefs}
          touchStartRef={touchStartRef}
          onSelectChapter={onSelectChapter}
          onPageTurnScreen={onPageTurnScreen}
          onAppendNextContinuousChapter={onAppendNextContinuousChapter}
          onOpenCitationMarker={onOpenCitationMarker}
          onJumpBackFromFootnoteDef={onJumpBackFromFootnoteDef}
          onStartTtsAtParagraph={onStartTtsAtParagraph}
          onSelectHighlightForNote={onSelectHighlightForNote}
          onTextMouseUp={onTextMouseUp}
          onOpenLightbox={onOpenLightbox}
          onSwitchPdfMode={onSwitchPdfMode}
          onSelectPdfCanvasPage={onSelectPdfCanvasPage}
          onOpenEntityWiki={onOpenEntityWiki}
        />
      )}
    </article>
  )
}
