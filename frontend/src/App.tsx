import React, { useState, useEffect, useCallback } from 'react'
import type { JumpTarget } from './types'
import { BookshelfView } from './features/bookshelf'
import { loadGlobalTtsCheckpoint } from './features/audio-tts'
import { getBookWithCache } from './utils/bookCache'
import { useReaderNavStore } from './stores/readerNavStore'
import { useTtsStore } from './stores/ttsStore'
import { useBooksStore } from './shared/stores/useBooksStore'
import { ErrorBoundary, LoadingFallback } from './shared/ui'
import { DesktopHeader, type NavPage } from './app/components/DesktopHeader'
import { MobileAppBar } from './app/components/MobileAppBar'
import { MobileBottomNav } from './app/components/MobileBottomNav'
import { GlobalListeningCapsule } from './app/components/GlobalListeningCapsule'

export type AppNavPage = 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts'

function lazyWithRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await factory()
      } catch (err) {
        if (attempt === 2) throw err
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      }
    }
    return factory()
  })
}

const loadReaderWorkspace = () => import('./features/reader').then((m) => ({ default: m.ReaderWorkspace }))
if (typeof window !== 'undefined') {
  window.setTimeout(() => { loadReaderWorkspace().catch(() => {}) }, 300)
}

const ReaderWorkspace = lazyWithRetry(loadReaderWorkspace)
const BookDiscoveryModal = lazyWithRetry(() => import('./features/discovery').then((m) => ({ default: m.BookDiscoveryModal })))
const SourceSettingsModal = lazyWithRetry(() => import('./features/discovery').then((m) => ({ default: m.SourceSettingsModal })))
const ReadingStatsModal = lazyWithRetry(() => import('./features/search-stats').then((m) => ({ default: m.ReadingStatsModal })))
const GlobalSearchModal = lazyWithRetry(() => import('./features/search-stats').then((m) => ({ default: m.GlobalSearchModal })))
const NotesAndAICenterView = lazyWithRetry(() => import('./features/notes').then((m) => ({ default: m.NotesAndAICenterView })))
const BlackGoldTheaterModal = lazyWithRetry(() => import('./features/audio-tts').then((m) => ({ default: m.BlackGoldTheaterModal })))

function useAppNavSlice() {
  const isReaderOpen = useReaderNavStore((s) => s.isReaderOpen)
  const activeBookId = useReaderNavStore((s) => s.activeBookId)
  const chapterIndex = useReaderNavStore((s) => s.chapterIndex)
  const jumpTarget = useReaderNavStore((s) => s.jumpTarget)
  const openTabBookIds = useReaderNavStore((s) => s.openTabBookIds)
  const activePage = useReaderNavStore((s) => s.activePage)
  const openBook = useReaderNavStore((s) => s.openBook)
  const closeReader = useReaderNavStore((s) => s.closeReader)
  const switchBookTab = useReaderNavStore((s) => s.switchBookTab)
  const closeBookTab = useReaderNavStore((s) => s.closeBookTab)
  const setChapterIndex = useReaderNavStore((s) => s.setChapterIndex)
  const setActivePage = useReaderNavStore((s) => s.setActivePage)
  const syncFromBrowserUrl = useReaderNavStore((s) => s.syncFromBrowserUrl)
  return { isReaderOpen, activeBookId, chapterIndex, jumpTarget, openTabBookIds, activePage, openBook, closeReader, switchBookTab, closeBookTab, setChapterIndex, setActivePage, syncFromBrowserUrl }
}

function useAppTtsSlice() {
  const audioStatus = useTtsStore((s) => s.audioStatus)
  const checkpoint = useTtsStore((s) => s.checkpoint)
  const resumeTtsNonce = useTtsStore((s) => s.resumeTtsNonce)
  const toggleTtsPlayPauseNonce = useTtsStore((s) => s.toggleTtsPlayPauseNonce)
  const openTtsModalNonce = useTtsStore((s) => s.openTtsModalNonce)
  const listeningCapsuleDismissed = useTtsStore((s) => s.listeningCapsuleDismissed)
  const setAudioStatus = useTtsStore((s) => s.setAudioStatus)
  const setCheckpoint = useTtsStore((s) => s.setCheckpoint)
  const triggerResumeTts = useTtsStore((s) => s.triggerResumeTts)
  const triggerTogglePlayPause = useTtsStore((s) => s.triggerTogglePlayPause)
  const triggerOpenTtsModal = useTtsStore((s) => s.triggerOpenTtsModal)
  const setListeningCapsuleDismissed = useTtsStore((s) => s.setListeningCapsuleDismissed)
  return { audioStatus, checkpoint, resumeTtsNonce, toggleTtsPlayPauseNonce, openTtsModalNonce, listeningCapsuleDismissed, setAudioStatus, setCheckpoint, triggerResumeTts, triggerTogglePlayPause, triggerOpenTtsModal, setListeningCapsuleDismissed }
}

function useAppActions() {
  const books = useBooksStore((s) => s.books)
  const fetchBooks = useBooksStore((s) => s.fetchBooks)
  const nav = useAppNavSlice()
  const tts = useAppTtsSlice()
  const [globalSearchInitQuery, setGlobalSearchInitQuery] = useState('')

  useEffect(() => {
    fetchBooks()
    const onPopState = () => nav.syncFromBrowserUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [fetchBooks, nav.syncFromBrowserUrl])

  useEffect(() => {
    if (tts.audioStatus.playing) tts.setListeningCapsuleDismissed(false)
  }, [tts.audioStatus.playing, tts.setListeningCapsuleDismissed])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (nav.isReaderOpen) nav.closeReader(true)
        nav.setActivePage('search')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nav.isReaderOpen, nav.closeReader, nav.setActivePage])

  const handleBookDownloaded = useCallback((bookId: string, openImmediately?: boolean) => {
    fetchBooks(true)
    getBookWithCache(bookId, true).catch(() => {})
    if (openImmediately) nav.openBook({ bookId, chapterIndex: 0 })
  }, [fetchBooks, nav.openBook])

  const handleResumeGlobalListening = useCallback((openReaderModal: boolean) => {
    if (tts.audioStatus.active && nav.activeBookId) {
      if (openReaderModal) {
        nav.openBook({ bookId: nav.activeBookId, chapterIndex: nav.chapterIndex })
        tts.triggerOpenTtsModal()
      } else {
        tts.triggerTogglePlayPause()
      }
      return
    }
    const cp = tts.checkpoint || loadGlobalTtsCheckpoint()
    const fallbackBookId = cp?.bookId || nav.activeBookId || books[0]?.id
    if (!fallbackBookId) return
    nav.openBook({
      bookId: fallbackBookId,
      chapterIndex: cp?.bookId === fallbackBookId ? cp.chapterIndex : 0,
      paragraphIndex: cp?.bookId === fallbackBookId ? cp.paragraphIndex : undefined,
    })
    if (openReaderModal) tts.triggerOpenTtsModal()
    tts.triggerResumeTts(fallbackBookId)
  }, [tts, nav, books])

  const handleOpenGlobalSearch = useCallback((q = '') => {
    setGlobalSearchInitQuery(q)
    nav.setActivePage('search')
  }, [nav.setActivePage])

  return { books, fetchBooks, nav, tts, globalSearchInitQuery, handleBookDownloaded, handleResumeGlobalListening, handleOpenGlobalSearch }
}

const AppPageRouter: React.FC<{
  activePage: AppNavPage
  books: ReturnType<typeof useBooksStore.getState>['books']
  openTabBookIds: string[]
  globalSearchInitQuery: string
  onOpenBook: (target: JumpTarget) => void
  onSelectPage: (page: AppNavPage) => void
  onOpenGlobalSearch: (q?: string) => void
  onBooksChanged: () => void
  onBookDownloaded: (bookId: string, openImmediately?: boolean) => void
  onCloseBookTab?: (bookId: string) => void
}> = ({ activePage, books, openTabBookIds, globalSearchInitQuery, onOpenBook, onSelectPage, onOpenGlobalSearch, onBooksChanged, onBookDownloaded, onCloseBookTab }) => {
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ shelf: true })

  useEffect(() => {
    if (!visitedTabs[activePage]) setVisitedTabs((prev) => ({ ...prev, [activePage]: true }))
  }, [activePage, visitedTabs])

  return (
    <>
      <div className={activePage === 'shelf' ? 'flex-1 flex flex-col w-full' : 'hidden'}>
        <BookshelfView
          books={books} openTabBookIds={openTabBookIds} onOpenBook={onOpenBook}
          onOpenDiscovery={() => onSelectPage('discovery')} onOpenSourceSettings={() => onSelectPage('sources')}
          onOpenStats={() => onSelectPage('stats')} onOpenNotesHub={() => onSelectPage('notes')}
          onOpenGlobalSearch={onOpenGlobalSearch} onBooksChanged={onBooksChanged} onCloseBookTab={onCloseBookTab}
        />
      </div>
      {visitedTabs.notes && (
        <div className={activePage === 'notes' ? 'flex-1 flex flex-col w-full' : 'hidden'}>
          <React.Suspense fallback={<LoadingFallback message="加载笔记与问书..." />}>
            <NotesAndAICenterView books={books} onOpenBook={onOpenBook} onBooksChanged={onBooksChanged} />
          </React.Suspense>
        </div>
      )}
      {visitedTabs.discovery && (
        <div className={activePage === 'discovery' ? 'flex-1 flex flex-col w-full' : 'hidden'}>
          <React.Suspense fallback={<LoadingFallback message="加载找书模块..." />}>
            <BookDiscoveryModal isOpen={true} asPage={true} onClose={() => onSelectPage('shelf')} onBookDownloaded={onBookDownloaded} onOpenSourceSettings={() => onSelectPage('sources')} />
          </React.Suspense>
        </div>
      )}
      {activePage === 'search' && (
        <React.Suspense fallback={<LoadingFallback message="加载全文搜索..." />}>
          <GlobalSearchModal isOpen={true} asPage={true} onClose={() => onSelectPage('shelf')} initialQuery={globalSearchInitQuery} onJumpToResult={onOpenBook} />
        </React.Suspense>
      )}
      {activePage === 'stats' && (
        <React.Suspense fallback={<LoadingFallback message="加载阅读统计..." />}>
          <ReadingStatsModal isOpen={true} asPage={true} onClose={() => onSelectPage('shelf')} books={books} />
        </React.Suspense>
      )}
      {activePage === 'sources' && (
        <React.Suspense fallback={<LoadingFallback message="加载书源配置..." />}>
          <SourceSettingsModal isOpen={true} asPage={true} onClose={() => onSelectPage('discovery')} />
        </React.Suspense>
      )}
      {activePage === 'tts' && (
        <React.Suspense fallback={<LoadingFallback message="加载听书大剧场..." />}>
          <BlackGoldTheaterModal isOpen={true} onClose={() => onSelectPage('shelf')} onOpenReader={(bookId) => onOpenBook({ bookId, chapterIndex: 0 })} books={books} />
        </React.Suspense>
      )}
    </>
  )
}

export const App: React.FC = () => {
  const { books, fetchBooks, nav, tts, globalSearchInitQuery, handleBookDownloaded, handleResumeGlobalListening, handleOpenGlobalSearch } = useAppActions()
  const handleChapterChange = useCallback((ch: number) => nav.setChapterIndex(ch, true), [nav.setChapterIndex])
  const handleBackToShelf = useCallback(() => { nav.closeReader(true); fetchBooks(true) }, [nav.closeReader, fetchBooks])
  const handleOpenDiscoveryFromReader = useCallback(() => { nav.closeReader(true); nav.setActivePage('discovery') }, [nav.closeReader, nav.setActivePage])
  const handleBooksChanged = useCallback(() => fetchBooks(true), [fetchBooks])
  const handleDismissCapsule = useCallback(() => {
    if (tts.audioStatus.playing) tts.triggerTogglePlayPause()
    tts.setListeningCapsuleDismissed(true)
  }, [tts.audioStatus.playing, tts.triggerTogglePlayPause, tts.setListeningCapsuleDismissed])

  const triggerGlobalFileUpload = useCallback(() => {
    if (nav.activePage !== 'shelf') {
      nav.setActivePage('shelf')
      window.setTimeout(() => { document.querySelector<HTMLInputElement>('input[data-lumina-book-upload="true"], input[type="file"]')?.click() }, 60)
      return
    }
    document.querySelector<HTMLInputElement>('input[data-lumina-book-upload="true"], input[type="file"]')?.click()
  }, [nav.activePage, nav.setActivePage])

  return (
    <ErrorBoundary name="AppRoot">
      {nav.activeBookId && (
        <React.Suspense fallback={<LoadingFallback message="正在初始化阅读器..." fullScreen />}>
          <ReaderWorkspace
            key={nav.activeBookId} activeBookId={nav.activeBookId} isHidden={!nav.isReaderOpen}
            resumeTtsNonce={tts.resumeTtsNonce} toggleTtsPlayPauseNonce={tts.toggleTtsPlayPauseNonce} openTtsModalNonce={tts.openTtsModalNonce}
            onGlobalTtsStatusChange={tts.setAudioStatus} onGlobalCheckpointSaved={tts.setCheckpoint}
            onChapterChange={handleChapterChange} jumpTarget={nav.jumpTarget} openTabBookIds={nav.openTabBookIds}
            allBooks={books} onSwitchBookTab={nav.switchBookTab} onCloseBookTab={nav.closeBookTab}
            onBackToShelf={handleBackToShelf} onOpenDiscovery={handleOpenDiscoveryFromReader} onBookStateUpdated={handleBooksChanged}
          />
        </React.Suspense>
      )}
      <div className={nav.isReaderOpen ? 'hidden' : 'min-h-dvh bg-[#f7f8fa] flex flex-col'}>
        <DesktopHeader activePage={nav.activePage as NavPage} onSelectPage={nav.setActivePage} onOpenSearch={() => handleOpenGlobalSearch('')} onTriggerUpload={triggerGlobalFileUpload} />
        <MobileAppBar activePage={nav.activePage as NavPage} onSelectPage={nav.setActivePage} onOpenSearch={() => handleOpenGlobalSearch('')} onTriggerUpload={triggerGlobalFileUpload} />
        <main
          className={`flex-1 flex flex-col w-full min-w-0 overflow-x-hidden ${
            !tts.listeningCapsuleDismissed && tts.audioStatus.active
              ? 'pb-[calc(8.25rem+env(safe-area-inset-bottom,0px))] md:pb-0'
              : 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
          }`}
        >
          <ErrorBoundary name={`Page:${nav.activePage}`}>
            <AppPageRouter
              activePage={nav.activePage} books={books} openTabBookIds={nav.openTabBookIds}
              globalSearchInitQuery={globalSearchInitQuery} onOpenBook={nav.openBook}
              onSelectPage={nav.setActivePage} onOpenGlobalSearch={handleOpenGlobalSearch}
              onBooksChanged={handleBooksChanged} onBookDownloaded={handleBookDownloaded} onCloseBookTab={nav.closeBookTab}
            />
          </ErrorBoundary>
        </main>
        <MobileBottomNav activePage={nav.activePage as NavPage} onSelectPage={nav.setActivePage} onOpenSearch={() => handleOpenGlobalSearch('')} onTriggerUpload={triggerGlobalFileUpload} />
        {!tts.listeningCapsuleDismissed && tts.audioStatus.active && (
          <GlobalListeningCapsule
            status={tts.audioStatus} checkpoint={tts.checkpoint} bookTitle={books.find((b) => b.id === (tts.audioStatus.bookId || nav.activeBookId))?.title}
            dismissed={tts.listeningCapsuleDismissed} onResumeListening={handleResumeGlobalListening}
            onTogglePlayPause={tts.triggerTogglePlayPause} onDismiss={handleDismissCapsule} onOpenTheater={() => nav.setActivePage('tts')}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
