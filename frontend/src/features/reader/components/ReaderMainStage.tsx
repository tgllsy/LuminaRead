import React, { Suspense } from 'react'
import { ReaderArticleCanvas } from './ReaderArticleCanvas'
import { CopilotEdgeTrigger } from './CopilotEdgeTrigger'
import { useReaderSelectionCapture } from '../hooks/useReaderSelectionCapture'
import { extractCleanSelectedText, getPdfFilterStyle } from '../helpers'
import { FONT_CLASS_MAP } from '../constants'
import type { getEffectiveThemeStyle } from '../constants'
import type { BookSummary, BookChapter, HighlightItem, BookmarkItem, PdfMode } from '../types'

const SidebarDrawer = React.lazy(() =>
  import('../../reader-sidebar').then((m) => ({ default: m.SidebarDrawer }))
)

export interface ReaderStageController {
  bc: { chapterIndex: number; [key: string]: any }
  overlays: { setSelectionState: (st: any) => void; drawerOpen: boolean; [key: string]: any }
  pdf: { pdfMode: PdfMode; [key: string]: any }
  typo: { typography: any; effectiveLayoutMode: 'single' | 'dual'; [key: string]: any }
  vp: { isSidebarPinned?: boolean; sidebarDockSide?: 'left' | 'right' | 'none'; windowWidth?: number; [key: string]: any }
  tts?: any
  gest?: any
  pag?: any
  stream?: any
  bil?: any
  cit?: any
  hl?: any
  bm?: any
  [key: string]: any
}

export interface ReaderMainStageProps {
  c: ReaderStageController
  book: BookSummary
  chapters: BookChapter[]
  highlights: HighlightItem[]
  bookmarks: BookmarkItem[]
  toc: Array<{ id: string; index: number; title: string; wordCount: number }>
  totalPdfPages: number
  isDualSpread: boolean
  progressPercent: number
  themeStyle: ReturnType<typeof getEffectiveThemeStyle>
  readingEstimateText?: string
  isHidden?: boolean
}

export const ReaderMainStage: React.FC<ReaderMainStageProps> = (props) => {
  const {
    c, book, chapters, highlights, bookmarks, toc, totalPdfPages,
    isDualSpread, progressPercent, themeStyle, readingEstimateText, isHidden = false,
  } = props
  const { lastSelectionTimeRef, handleSelectionCapture } = useReaderSelectionCapture({
    chapterIndex: c.bc.chapterIndex,
    highlights,
    setSelectionState: c.overlays.setSelectionState,
    isHidden,
  })

  const isPdfPageCanvas = book.format === 'pdf' && c.pdf.pdfMode === 'page_canvas'
  const isPaged = (isDualSpread || c.typo.typography.continuousScroll === false) && !isPdfPageCanvas
  const isPinnedDock = Boolean(c.vp.isSidebarPinned && c.vp.canPinSidebar && c.overlays.drawerOpen)
  const isCopilotDocked = Boolean(
    c.overlays.copilotModal?.isOpen && (c.vp?.windowWidth ? c.vp.windowWidth >= 768 : true)
  )

  const leftPadding = isPinnedDock && c.vp.sidebarDockSide === 'left'
    ? 'lg:pl-[360px] xl:pl-[380px]'
    : ''

  const rightPadding = [
    isPinnedDock && c.vp.sidebarDockSide === 'right' ? 'lg:pr-[360px] xl:pr-[380px]' : '',
    isCopilotDocked ? 'md:pr-[420px] lg:pr-[450px] xl:pr-[480px] 2xl:pr-[500px]' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={
        isPaged
          ? 'flex-1 min-h-0 flex items-stretch justify-center w-full relative overflow-hidden'
          : 'flex-1 flex items-start justify-center w-full relative'
      }
    >
      <main
        onClick={(e) => {
          if (c.overlays.copilotModal?.isOpen) {
            c.overlays.setCopilotModal((p: any) => ({ ...p, isOpen: false }))
            return
          }
          if (e.target === e.currentTarget && (isPaged || isPdfPageCanvas)) {
            c.gest.handleScreenHotzoneClick(e)
          }
        }}
        className={`${leftPadding} ${rightPadding} transition-[padding,margin,width] duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${
          isPaged
            ? 'flex-1 min-w-0 h-full flex flex-col items-center justify-center px-0 sm:px-6 py-0 sm:py-3 relative overflow-hidden'
            : isPdfPageCanvas
            ? 'flex-1 min-w-0 flex flex-col items-center px-0 sm:px-4 py-0 sm:py-3 relative'
            : 'flex-1 min-w-0 flex flex-col items-center px-0 sm:px-6 py-0 sm:py-6 relative'
        }`}
      >
        <ReaderArticleCanvas
          articleRef={c.articleRef}
          readingEstimateText={readingEstimateText}
          onCanvasClick={(e) => {
            if (c.overlays.copilotModal?.isOpen) {
              c.overlays.setCopilotModal((p: any) => ({ ...p, isOpen: false }))
              return
            }
            if (Date.now() - lastSelectionTimeRef.current < 450) return
            if (Date.now() - c.gest.lastSwipeTimeRef.current < 450 || extractCleanSelectedText().length >= 2) return
            if (c.overlays.selectionState) {
              c.overlays.setSelectionState(null)
              return
            }
            c.gest.handleScreenHotzoneClick(e)
          }}
          onSpreadWheel={(e) => {
            if (isPdfPageCanvas) return
            if (c.typo.effectiveLayoutMode !== 'dual' || Math.abs(e.deltaY) < 18 || Date.now() - c.lastWheelTurnRef.current < 260) return
            c.lastWheelTurnRef.current = Date.now()
            c.handlePageTurnScreen(e.deltaY > 0 ? 'next' : 'prev')
          }}
          onTouchStartCapture={c.gest.handleTouchStart}
          onTouchEnd={(e) => {
            c.gest.handleTouchEnd(e)
            handleSelectionCapture()
          }}
          book={book}
          pdfMode={c.pdf.pdfMode}
          effectiveLayoutMode={c.typo.effectiveLayoutMode}
          typography={c.typo.typography}
          isDualSpread={isDualSpread}
          themeStyle={themeStyle}
          fontClass={(FONT_CLASS_MAP as Record<string, string>)[c.typo.typography.fontFamily] || 'reader-font-serif'}
          chapters={chapters}
          chapterIndex={c.bc.chapterIndex}
          currentChapter={c.activeChapterObj}
          isContinuousSingleScroll={c.isContinuousSingleScroll}
          connectedChapterIndices={c.stream.connectedChapterIndices}
          returnAnchor={c.overlays.returnAnchor}
          onReturnAnchorClick={c.handleReturnToAnchor}
          pdfEyeCareFilter={c.pdf.pdfEyeCareFilter}
          onTogglePdfEyeCareFilter={() => c.pdf.setPdfEyeCareFilter((v: boolean) => !v)}
          onSwitchPdfMode={c.pdf.setPdfMode}
          onSelectPdfCanvasPage={c.pdf.setPdfCanvasPage}
          pdfCanvasPage={c.pdf.pdfCanvasPage}
          pdfMeta={c.pdf.pdfMeta}
          totalPdfPages={totalPdfPages}
          pdfSpreadMode={c.pdf.pdfSpreadMode}
          pdfZoom={c.pdf.pdfZoom}
          pdfFilterStyle={getPdfFilterStyle(c.typo.typography.theme, c.pdf.pdfEyeCareFilter)}
          paragraphs={c.paragraphs}
          chapterHighlights={highlights.filter((h) => h.chapter_index === c.bc.chapterIndex)}
          highlights={highlights}
          paginatedSpreads={c.pag.paginatedSpreads}
          clampedSpreadIndex={c.pag.clampedSpreadIndex}
          progressPercent={progressPercent}
          referenceDividerIdx={c.referenceDividerIdx}
          isCurrentChapterReference={/参考文献|注释/i.test(c.activeChapterObj.title)}
          highlightKeyword={c.overlays.highlightKeyword}
          isListeningMode={c.tts.ttsAudioStatus.active || c.tts.ttsActivePara !== null || c.overlays.showAmbientTTS}
          ttsActivePara={c.tts.ttsActivePara}
          flashedParaIndex={c.overlays.flashedParaIndex}
          focusedPara={c.tts.focusedPara}
          bilingualMap={c.bil.bilingualMap}
          bottomSentinelRef={c.bottomSentinelRef}
          chapterStreamRefs={c.chapterStreamRefs}
          paragraphRefs={c.paragraphRefs}
          touchStartRef={c.gest.touchStartRef}
          onSelectChapter={c.handleSelectChapter}
          onPageTurnScreen={c.handlePageTurnScreen}
          onAppendNextContinuousChapter={() => c.stream.appendNextContinuousChapter(true)}
          onOpenCitationMarker={c.cit.handleOpenCitationMarker}
          onJumpBackFromFootnoteDef={c.cit.handleJumpBackFromFootnoteDef}
          onStartTtsAtParagraph={c.tts.handleStartTtsAtParagraph}
          onSelectHighlightForNote={(hl, pIdx, anchorRect) => {
            lastSelectionTimeRef.current = Date.now()
            c.overlays.setSelectionState({
              text: hl.selected_text,
              paragraphIndex: pIdx,
              chapterIndex: hl.chapter_index ?? c.bc.chapterIndex,
              existing: hl,
              openNoteEditorInitially: true,
              anchorRect: anchorRect || null,
            })
          }}
          onTextMouseUp={(pIdx, chIdx) => {
            handleSelectionCapture(pIdx, chIdx)
          }}
          onOpenLightbox={(url, title, pageNum) => c.overlays.setLightboxImage({ url, title, pageNum })}
          onSetPdfSpreadMode={c.pdf.setPdfSpreadMode}
          onSetPdfZoom={c.pdf.setPdfZoom}
          onJumpToPdfPage={(p) => c.pdf.setPdfCanvasPage(Math.max(1, Math.min(p, totalPdfPages)))}
          onOpenEntityWiki={(term, anchorRect) => {
            c.overlays.setEntityWikiModal({ isOpen: true, entityName: term, anchorRect })
          }}
        />
      </main>
      <Suspense fallback={null}>
        <SidebarDrawer
            isOpen={c.overlays.drawerOpen}
            activeTab={c.overlays.drawerTab}
            onTabChange={c.overlays.setDrawerTab}
            onClose={() => c.overlays.setDrawerOpen(false)}
            book={book}
            toc={toc}
            currentChapterIndex={c.bc.chapterIndex}
            highlights={highlights}
            bookmarks={bookmarks}
            initialSearchQuery={c.overlays.drawerSearchInit}
            isPinned={c.vp.isSidebarPinned}
            canPin={c.vp.canPinSidebar}
            onTogglePin={c.vp.toggleSidebarPin}
            dockSide={c.vp.sidebarDockSide}
            onToggleDockSide={c.vp.toggleSidebarDock}
            theme={c.typo.typography.theme}
            onSelectChapter={c.handleSelectChapter}
            onDeleteHighlight={c.hl.handleDeleteHighlight}
            onDeleteBookmark={c.bm.handleDeleteBookmark}
          />
        </Suspense>
      <CopilotEdgeTrigger
        isOpen={Boolean(c.overlays.copilotModal?.isOpen)}
        onClick={() => {
          c.overlays.setCopilotModal({ isOpen: true, mode: 'spoiler_free_recap', text: '' })
        }}
        theme={c.typo.typography.theme}
        isHidden={isHidden}
      />
    </div>
  )
}
