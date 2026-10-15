import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import type { ReaderWorkspaceProps } from './types'
import { getEffectiveThemeStyle, FONT_CLASS_MAP } from './constants'
import { getPdfFilterStyle, extractCleanSelectedText, getSelectionDetails } from './helpers'
import {
  useBookContent, useReaderViewport, useBookTabs, useReadingProgressSync,
  useChapterStream, usePaginationLayout, useReaderHotkeys, useReaderGestures,
  useReaderHighlights, useReaderBookmarks, useReaderCitations, useReaderTypographyState,
  useReaderPdfState, useReaderOverlaysState, useReaderChapterSelect, useReaderScreenTurn,
  useReaderBilingual, useReaderTtsState, getVisibleParagraphIndex, useReaderSelectionCapture,
  useReadingEstimate,
} from './hooks'
import {
  ReaderTopNavbar, ReaderBottomBar, DesktopFloatingToolbar,
  ReaderModalsLayer, ReaderLoadingFallback, ReaderMainStage,
} from './components'
import { stopLocalTts } from '../audio-tts/helpers/globalTtsCoordinator'

function useReaderCoreData(props: ReaderWorkspaceProps) {
  const { activeBookId, isHidden = false, openTtsModalNonce = 0, onChapterChange, jumpTarget, openTabBookIds, allBooks, onSwitchBookTab, onCloseBookTab, onBookStateUpdated } = props
  const bc = useBookContent({ activeBookId, allBooks, jumpTarget, onChapterChange })
  const vp = useReaderViewport()
  const { openTabBooks } = useBookTabs({ openTabBookIds, allBooks, activeBookId, onSwitchBookTab, onCloseBookTab })
  const typo = useReaderTypographyState(vp.isDesktop)
  const isPdf = bc.contentData?.book.format === 'pdf'
  const pdf = useReaderPdfState(activeBookId, Boolean(isPdf))
  const overlays = useReaderOverlaysState()
  const paragraphRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const articleRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const chapterStreamRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const lastWheelTurnRef = useRef<number>(0)
  const bil = useReaderBilingual(activeBookId, bc.chapterIndex, typo.typography.bilingualMode)
  const handleOpenAmbientTtsModal = useCallback(() => overlays.setShowAmbientTTS(true), [overlays.setShowAmbientTTS])
  const tts = useReaderTtsState({ activeBookId, openTtsModalNonce, onOpenAmbientTtsModal: handleOpenAmbientTtsModal })

  const getCurrentParaIndex = useCallback(
    () => getVisibleParagraphIndex(paragraphRefs, tts.ttsActivePara, tts.focusedPara, bc.chapterIndex),
    [paragraphRefs, tts.ttsActivePara, tts.focusedPara, bc.chapterIndex]
  )

  const activeChapterObj = bc.contentData?.chapters[bc.chapterIndex] || bc.contentData?.chapters[0] || { id: 'ch_1', title: '正文', content: '', wordCount: 0, order: 0 }
  const paragraphs = useMemo(() => String(activeChapterObj.content || '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean), [activeChapterObj.content])

  const { reportProgress } = useReadingProgressSync({
    activeBookId,
    chapterIndex: bc.chapterIndex,
    getCurrentVisibleParagraphIndex: getCurrentParaIndex,
    totalChapters: bc.contentData?.chapters.length || 1,
    totalParagraphs: paragraphs.length,
    onBookStateUpdated,
    isHidden,
  })

  const isContinuousSingleScroll = typo.effectiveLayoutMode === 'single' && typo.typography.continuousScroll !== false && !(isPdf && pdf.pdfMode === 'page_canvas')
  const scrollSyncFnRef = useRef<(nextChIdx: number) => void>(() => {})
  const onScrollSyncChapter = useCallback((nextChIdx: number) => scrollSyncFnRef.current(nextChIdx), [])
  const stream = useChapterStream({ activeBookId, chapterIndex: bc.chapterIndex, isContinuousSingleScroll, contentData: bc.contentData, setContentData: bc.setContentData, bottomSentinelRef, chapterStreamRefs, onScrollSyncChapter, isHidden })
  const dockedSidebarWidth = (vp.isSidebarPinned && overlays.drawerOpen && vp.sidebarDockSide !== 'none') ? (vp.windowWidth >= 1280 ? 380 : vp.windowWidth >= 1024 ? 350 : 320) : 0
  const pag = usePaginationLayout({
    paragraphs,
    typography: typo.typography,
    windowWidth: Math.max(640, vp.windowWidth - dockedSidebarWidth),
    windowHeight: vp.windowHeight,
    focusParaIndex: tts.ttsActivePara ?? overlays.flashedParaIndex,
    pdfMode: pdf.pdfMode,
    enabled: !isContinuousSingleScroll,
  })

  const syncHighlightKw = useCallback((kw: string) => {
    overlays.setHighlightKeyword(kw)
    if (kw) overlays.setDrawerSearchInit(kw)
  }, [overlays.setHighlightKeyword, overlays.setDrawerSearchInit])

  const { handleSelectChapter, pendingScrollTargetRef } = useReaderChapterSelect({
    contentData: bc.contentData, setContentData: bc.setContentData, chapterIndex: bc.chapterIndex, setChapterIndex: bc.setChapterIndex,
    setConnectedChapterIndices: stream.setConnectedChapterIndices, setPdfCanvasPage: pdf.setPdfCanvasPage,
    setReturnAnchor: overlays.setReturnAnchor, setSelectionState: overlays.setSelectionState, setFootnoteModal: overlays.setFootnoteModal,
    setFlashedParaIndex: overlays.setFlashedParaIndex, setHighlightKeyword: syncHighlightKw, reportProgress, paragraphRefs, isHidden, jumpTarget,
  })
  scrollSyncFnRef.current = (nextChIdx: number) => {
    pendingScrollTargetRef.current = { type: 'none' }
    overlays.setFlashedParaIndex(null)
    bc.setChapterIndex(nextChIdx)
    const total = Math.max(1, bc.contentData?.chapters.length || 1)
    reportProgress(nextChIdx, 0, Math.round(((nextChIdx + 1) / total) * 100), 15).catch(() => {})
  }

  return { bc, vp, openTabBooks, typo, pdf, overlays, paragraphRefs, articleRef, bottomSentinelRef, chapterStreamRefs, lastWheelTurnRef, bil, tts, activeChapterObj, isContinuousSingleScroll, stream, paragraphs, pag, handleSelectChapter }
}

function useReaderWorkspaceController(props: ReaderWorkspaceProps) {
  const { activeBookId, isHidden = false, onBookStateUpdated } = props
  const core = useReaderCoreData(props)
  const { bc, typo, pdf, overlays, paragraphRefs, tts, activeChapterObj, paragraphs, pag, handleSelectChapter } = core

  const totalPdfPages = pdf.pdfMeta?.total_pages || pdf.pdfMeta?.totalPages || bc.contentData?.chapters[bc.contentData.chapters.length - 1]?.pageEnd || 1
  const { handlePageTurnScreen } = useReaderScreenTurn({
    contentData: bc.contentData, chapterIndex: bc.chapterIndex, typography: typo.typography, effectiveLayoutMode: typo.effectiveLayoutMode,
    pdfMode: pdf.pdfMode, clampedSpreadIndex: pag.clampedSpreadIndex, paginatedSpreadsLength: pag.paginatedSpreads.length,
    setSpreadIndex: pag.setSpreadIndex, turnToLastSpreadRef: pag.turnToLastSpreadRef, onSelectChapter: handleSelectChapter,
    pdfCanvasPage: pdf.pdfCanvasPage,
    totalPdfPages,
    pdfSpreadMode: pdf.pdfSpreadMode,
    onJumpToPdfPage: pdf.setPdfCanvasPage,
  })
  const gest = useReaderGestures({
    onPageTurnScreen: handlePageTurnScreen,
    setShowTypography: overlays.setShowTypography,
    eInkMode: typo.typography.eInkMode,
    isHidden,
  })
  const isDualSpread = typo.effectiveLayoutMode === 'dual' && !(bc.contentData?.book.format === 'pdf' && pdf.pdfMode === 'page_canvas')
  const readingEst = useReadingEstimate({
    currentChapter: activeChapterObj, paragraphs,
    currentParaIndex: tts.ttsActivePara ?? overlays.flashedParaIndex ?? 0,
    wpmReadingSpeed: typo.typography.wpmReadingSpeed,
    isDualSpread, clampedSpreadIndex: pag.clampedSpreadIndex, totalSpreads: pag.paginatedSpreads.length,
  })
  const hasModalOpen = Boolean(
    overlays.drawerOpen || overlays.showTypography || overlays.showAmbientTTS ||
    overlays.copilotModal.isOpen || overlays.footnoteModal || overlays.posterModal || overlays.entityWikiModal
  )
  useReaderHotkeys({
    isHidden, hasModalOpen, effectiveLayoutMode: typo.effectiveLayoutMode, chapterIndex: bc.chapterIndex, onPageTurnScreen: handlePageTurnScreen,
    onSelectChapter: handleSelectChapter, onDismissOverlays: () => { gest.setImmersiveHudVisible(false); overlays.setShowTypography(false) },
  })
  const hl = useReaderHighlights({
    bookId: activeBookId, chapterIndex: bc.chapterIndex, currentChapterTitle: activeChapterObj.title, contentData: bc.contentData,
    setContentData: bc.setContentData, selectionState: overlays.selectionState, setSelectionState: overlays.setSelectionState, onBookStateUpdated,
  })
  const getCurrentParaIndex = () => getVisibleParagraphIndex(paragraphRefs, tts.ttsActivePara, tts.focusedPara, bc.chapterIndex)
  const bm = useReaderBookmarks({
    bookId: activeBookId, chapterIndex: bc.chapterIndex, currentChapterTitle: activeChapterObj.title, contentData: bc.contentData,
    setContentData: bc.setContentData, getCurrentVisibleParagraphIndex: getCurrentParaIndex, paragraphs,
    chaptersCount: bc.contentData?.chapters.length || 1, setBookmarkToast: overlays.setBookmarkToast,
  })
  const bibChapterIndex = useMemo(() => (bc.contentData?.chapters || []).findIndex((c) => /参考文献|References|Bibliography/i.test(c.title || '')), [bc.contentData?.chapters])
  const referenceDividerIdx = useMemo(() => paragraphs.findIndex((p: string) => /参考文献|注释/i.test(p)), [paragraphs])
  const cit = useReaderCitations({
    paragraphs, chapters: bc.contentData?.chapters || [], chapterIndex: bc.chapterIndex, currentChapterTitle: activeChapterObj.title,
    bibChapterIndex, returnAnchor: overlays.returnAnchor, setReturnAnchor: overlays.setReturnAnchor,
    setFootnoteModal: overlays.setFootnoteModal, onSelectChapter: (c, p) => handleSelectChapter(c, p),
  })
  const handleReturnToAnchor = () => {
    if (overlays.returnAnchor) {
      const target = overlays.returnAnchor; overlays.setReturnAnchor(null); handleSelectChapter(target.chapterIndex, target.paragraphIndex)
    }
  }
  const openDrawerTab = (tab: 'toc' | 'search' | 'notes' | 'bookmarks', searchKw?: string) => {
    if (searchKw === undefined && overlays.drawerOpen && overlays.drawerTab === tab) { overlays.setDrawerOpen(false); return }
    if (searchKw !== undefined) overlays.setDrawerSearchInit(searchKw)
    overlays.setDrawerTab(tab); overlays.setDrawerOpen(true); overlays.setShowTypography(false); overlays.setShowAmbientTTS(false); gest.setImmersiveHudVisible(false)
  }
  return { ...core, handlePageTurnScreen, gest, hl, getCurrentParaIndex, bm, referenceDividerIdx, cit, handleReturnToAnchor, openDrawerTab, readingEst, isDualSpread }
}

const ReaderWorkspaceFloatingBars: React.FC<{
  c: ReturnType<typeof useReaderWorkspaceController>
  highlightsCount: number
}> = ({ c, highlightsCount }) => {
  return (
    <>
      <DesktopFloatingToolbar
        typography={c.typo.typography} onToggleLayoutMode={() => c.typo.setTypography((p) => ({ ...p, layoutMode: p.layoutMode === 'dual' ? 'single' : 'dual' }))}
        showTypography={c.overlays.showTypography} activeBottomTab={c.overlays.activeBottomTab}
        onOpenTypographyTab={(tab) => {
          if (c.overlays.showTypography && c.overlays.activeBottomTab === tab) { c.overlays.setShowTypography(false); return }
          c.overlays.setActiveBottomTab(tab); c.overlays.setShowTypography(true); c.overlays.setShowAmbientTTS(false); if (!c.vp.isSidebarPinned) c.overlays.setDrawerOpen(false)
        }}
        drawerOpen={c.overlays.drawerOpen} drawerTab={c.overlays.drawerTab} onOpenDrawerTab={c.openDrawerTab}
        dockSide={c.vp.sidebarDockSide}
        onOpenCopilot={() => { c.overlays.setShowTypography(false); c.overlays.setCopilotModal((p) => ({ isOpen: !p.isOpen, mode: 'spoiler_free_recap', text: '' })) }}
        onOpenTTS={() => { c.overlays.setShowTypography(false); c.overlays.setShowAmbientTTS((v) => !v) }} highlightsCount={highlightsCount}
        isTtsActive={c.tts.ttsAudioStatus.active || c.tts.ttsActivePara !== null} isTtsPlaying={c.tts.ttsAudioStatus.playing} isTtsAmbientActive={c.tts.ttsAudioStatus.ambientActive}
      />
      <ReaderBottomBar
        typography={c.typo.typography} isScrolling={c.gest.isScrolling} immersiveHudVisible={c.gest.immersiveHudVisible}
        showTypography={c.overlays.showTypography} showAmbientTTS={c.overlays.showAmbientTTS} drawerOpen={c.overlays.drawerOpen}
        isCopilotOpen={c.overlays.copilotModal.isOpen} hasSelection={Boolean(c.overlays.selectionState)} hasFootnoteModal={Boolean(c.overlays.footnoteModal)}
        isTtsActive={c.tts.ttsAudioStatus.active || c.tts.ttsActivePara !== null} isTtsPlaying={c.tts.ttsAudioStatus.playing} isTtsAmbientActive={c.tts.ttsAudioStatus.ambientActive}
        onOpenCopilot={() => c.overlays.setCopilotModal({ isOpen: true, mode: 'spoiler_free_recap', text: '' })} onOpenTTS={() => c.overlays.setShowAmbientTTS(true)}
        bookmarkToast={c.overlays.bookmarkToast} returnAnchor={c.overlays.returnAnchor} onReturnToAnchor={c.handleReturnToAnchor} onClearReturnAnchor={() => c.overlays.setReturnAnchor(null)}
        readingEstimateText={c.readingEst.formattedText}
        isPageCanvas={c.bc.contentData?.book.format === 'pdf' && c.pdf.pdfMode === 'page_canvas'}
      />
    </>
  )
}

export const ReaderWorkspace: React.FC<ReaderWorkspaceProps> = (props) => {
  const { activeBookId, isHidden = false, resumeTtsNonce = 0, toggleTtsPlayPauseNonce = 0, onGlobalTtsStatusChange, onGlobalCheckpointSaved, allBooks, onSwitchBookTab, onCloseBookTab, onBackToShelf } = props
  const c = useReaderWorkspaceController(props)

  useEffect(() => {
    if (isHidden) {
      document.documentElement.classList.remove('eink-mode')
      return
    }
    const isEink = Boolean(c.typo.typography.eInkMode || c.typo.typography.theme === 'eink')
    document.documentElement.classList.toggle('eink-mode', isEink)
    return () => { document.documentElement.classList.remove('eink-mode') }
  }, [isHidden, c.typo.typography.eInkMode, c.typo.typography.theme])

  useEffect(() => {
    return () => {
      stopLocalTts(`ReaderWorkspace unmounted for book ${activeBookId}`)
    }
  }, [activeBookId])

  if (!c.bc.contentData || c.bc.contentData.book.id !== activeBookId) {
    return <ReaderLoadingFallback isHidden={isHidden} fallbackBook={allBooks.find((b) => b.id === activeBookId)} loadError={c.bc.loadError} onRetry={c.bc.retry} onBackToShelf={onBackToShelf} />
  }

  const { book, chapters, highlights, bookmarks } = c.bc.contentData
  const toc = Array.isArray(c.bc.contentData.toc) ? c.bc.contentData.toc : chapters.map((ch, i) => ({ id: ch.id || `ch_${i + 1}`, index: i, title: ch.title || `第 ${i + 1} 章`, wordCount: ch.wordCount || 0 }))
  const totalPdfPages = c.pdf.pdfMeta?.total_pages || c.pdf.pdfMeta?.totalPages || chapters[chapters.length - 1]?.pageEnd || Math.max(1, chapters.length * 15)
  const isDualSpread = c.typo.effectiveLayoutMode === 'dual' && !(book.format === 'pdf' && c.pdf.pdfMode === 'page_canvas')
  const progressPercent = Math.round(((c.bc.chapterIndex + 1) / chapters.length) * 100)
  const themeStyle = getEffectiveThemeStyle(c.typo.typography)

  return (
    <div className={`${isHidden ? 'hidden' : isDualSpread ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen flex flex-col'} ${themeStyle.outer}`}>
      {!isHidden && (c.typo.typography.brightness ?? 100) < 100 && (
        <div style={{ opacity: Math.min(0.65, ((100 - (c.typo.typography.brightness ?? 100)) / 100) * 0.75) }} className="fixed inset-0 bg-black pointer-events-none z-[45] transition-opacity" />
      )}
      <ReaderTopNavbar
        book={book} chapterTitle={c.activeChapterObj.title} chapterIndex={c.bc.chapterIndex} totalChapters={chapters.length} progressPercent={progressPercent} typography={c.typo.typography}
        openTabBooks={c.openTabBooks} onSwitchBookTab={onSwitchBookTab} onCloseBookTab={onCloseBookTab} onBackToShelf={onBackToShelf}
        onToggleBilingual={() => c.typo.setTypography((p) => ({ ...p, bilingualMode: !p.bilingualMode }))} bilingualLoading={c.bil.bilingualLoading} onAddBookmark={c.bm.handleAddBookmark}
        pdfMode={c.pdf.pdfMode}
        onTogglePdfMode={() => c.pdf.setPdfMode((p) => (p === 'hybrid' ? 'page_canvas' : p === 'page_canvas' ? 'text_only' : 'hybrid'))}
        immersiveHudVisible={c.gest.immersiveHudVisible} showTypography={c.overlays.showTypography} onOpenImmersiveHud={() => c.gest.setImmersiveHudVisible(true)}
        onOpenSearch={() => c.openDrawerTab('search')} onOpenNotes={() => c.openDrawerTab('notes')} hasHighlights={highlights.length > 0}
        readingEstimateText={c.readingEst.formattedText}
      />
      <ReaderMainStage c={c} book={book} chapters={chapters} highlights={highlights} bookmarks={bookmarks} toc={toc} totalPdfPages={totalPdfPages} isDualSpread={isDualSpread} progressPercent={progressPercent} themeStyle={themeStyle} readingEstimateText={c.readingEst.formattedText} isHidden={isHidden} />
      <ReaderWorkspaceFloatingBars c={c} highlightsCount={highlights.length} />
      <ReaderModalsLayer
        isHidden={isHidden} typography={c.typo.typography} setTypography={c.typo.setTypography} showTypography={c.overlays.showTypography} setShowTypography={c.overlays.setShowTypography}
        activeBottomTab={c.overlays.activeBottomTab} setActiveBottomTab={c.overlays.setActiveBottomTab} immersiveHudVisible={c.gest.immersiveHudVisible} setImmersiveHudVisible={c.gest.setImmersiveHudVisible}
        book={book} chapters={chapters} currentChapter={c.activeChapterObj} chapterIndex={c.bc.chapterIndex} progressPercent={progressPercent} paragraphs={c.paragraphs}
        showAmbientTTS={c.overlays.showAmbientTTS} setShowAmbientTTS={c.overlays.setShowAmbientTTS} ttsAudioStatus={c.tts.ttsAudioStatus} setTtsAudioStatus={c.tts.setTtsAudioStatus}
        ttsActivePara={c.tts.ttsActivePara} setTtsActivePara={c.tts.setTtsActivePara} resumeTtsNonce={resumeTtsNonce} toggleTtsPlayPauseNonce={toggleTtsPlayPauseNonce} playParagraphRequest={c.tts.playParagraphRequest}
        onGlobalTtsStatusChange={onGlobalTtsStatusChange} onGlobalCheckpointSaved={onGlobalCheckpointSaved} getCurrentVisibleParagraphIndex={c.getCurrentParaIndex}
        selectionState={c.overlays.selectionState} setSelectionState={c.overlays.setSelectionState} copilotModal={c.overlays.copilotModal} setCopilotModal={c.overlays.setCopilotModal}
        posterModal={c.overlays.posterModal} setPosterModal={c.overlays.setPosterModal} footnoteModal={c.overlays.footnoteModal} setFootnoteModal={c.overlays.setFootnoteModal}
        entityWikiModal={c.overlays.entityWikiModal} setEntityWikiModal={c.overlays.setEntityWikiModal}
        lightboxImage={c.overlays.lightboxImage} setLightboxImage={c.overlays.setLightboxImage} totalPdfPages={totalPdfPages}
        onSelectChapter={c.handleSelectChapter} onOpenDrawerTab={c.openDrawerTab} onOpenSearchDrawer={(kw) => c.openDrawerTab('search', kw)}
        onCreateOrUpdateHighlight={c.hl.handleCreateOrUpdateHighlight} onDeleteHighlight={c.hl.handleDeleteHighlight} onSaveInsightAsNote={c.hl.handleSaveInsightAsNote}
        onJumpToFootnoteTarget={(ch, p) => {
          const srcPara = c.overlays.footnoteModal?.sourceParagraphIndex ?? c.getCurrentParaIndex()
          c.handleSelectChapter(ch, p, undefined, { chapterIndex: c.bc.chapterIndex, paragraphIndex: srcPara, scrollY: window.scrollY, label: `${c.activeChapterObj.title} · 段落 #${srcPara + 1}` })
        }}
        onJumpToBibliography={(bib) => {
          const srcPara = c.overlays.footnoteModal?.sourceParagraphIndex ?? c.getCurrentParaIndex()
          c.handleSelectChapter(bib, 0, undefined, { chapterIndex: c.bc.chapterIndex, paragraphIndex: srcPara, scrollY: window.scrollY, label: `${c.activeChapterObj.title} · 段落 #${srcPara + 1}` })
        }}
        onShowToast={c.overlays.setBookmarkToast} onStartTtsAtParagraph={c.tts.handleStartTtsAtParagraph}
      />
    </div>
  )
}

export default ReaderWorkspace
