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
import { MobileBottomNav } from './app/components/MobileBottomNav'
import { GlobalListeningCapsule } from './app/components/GlobalListeningCapsule'

/**
 * 顶级路由全屏页面契约: 'shelf' | 'discovery' | 'search' | 'stats' | 'sources'
 * 包含核心导航入口: 笔记 · 问书
 */
export type AppNavPage = 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes'

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
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

const loadReaderWorkspace = () =>
  import('./features/reader').then((m) => ({ default: m.ReaderWorkspace }))

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    loadReaderWorkspace().catch(() => {})
  }, 300)
}

const ReaderWorkspace = lazyWithRetry(loadReaderWorkspace)
const BookDiscoveryModal = lazyWithRetry(() =>
  import('./features/discovery').then((m) => ({ default: m.BookDiscoveryModal }))
)
const SourceSettingsModal = lazyWithRetry(() =>
  import('./features/discovery').then((m) => ({ default: m.SourceSettingsModal }))
)
const ReadingStatsModal = lazyWithRetry(() =>
  import('./features/search-stats').then((m) => ({ default: m.ReadingStatsModal }))
)
const GlobalSearchModal = lazyWithRetry(() =>
  import('./features/search-stats').then((m) => ({ default: m.GlobalSearchModal }))
)
const NotesAndAICenterView = lazyWithRetry(() =>
  import('./features/notes').then((m) => ({ default: m.NotesAndAICenterView }))
)

function useAppActions() {
  const { books, fetchBooks } = useBooksStore()
  const nav = useReaderNavStore()
  const tts = useTtsStore()
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
  }, [books, nav, tts])

  const handleOpenGlobalSearch = useCallback((q = '') => {
    setGlobalSearchInitQuery(q)
    nav.setActivePage('search')
  }, [nav.setActivePage])

  return {
    books,
    fetchBooks,
    nav,
    tts,
    globalSearchInitQuery,
    handleBookDownloaded,
    handleResumeGlobalListening,
    handleOpenGlobalSearch,
  }
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
}> = ({
  activePage, books, openTabBookIds, globalSearchInitQuery,
  onOpenBook, onSelectPage, onOpenGlobalSearch, onBooksChanged, onBookDownloaded, onCloseBookTab,
}) => {
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    shelf: true,
  })

  useEffect(() => {
    if (!visitedTabs[activePage]) {
      setVisitedTabs((prev) => ({ ...prev, [activePage]: true }))
    }
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
            <BookDiscoveryModal
              isOpen={true} asPage={true}
              onClose={() => onSelectPage('shelf')}
              onBookDownloaded={onBookDownloaded}
              onOpenSourceSettings={() => onSelectPage('sources')}
            />
          </React.Suspense>
        </div>
      )}

      {activePage === 'search' && (
        <React.Suspense fallback={<LoadingFallback message="加载全文搜索..." />}>
          <GlobalSearchModal
            isOpen={true} asPage={true}
            onClose={() => onSelectPage('shelf')}
            initialQuery={globalSearchInitQuery}
            onJumpToResult={onOpenBook}
          />
        </React.Suspense>
      )}

      {activePage === 'stats' && (
        <React.Suspense fallback={<LoadingFallback message="加载阅读统计..." />}>
          <ReadingStatsModal
            isOpen={true} asPage={true}
            onClose={() => onSelectPage('shelf')}
            books={books}
          />
        </React.Suspense>
      )}

      {activePage === 'sources' && (
        <React.Suspense fallback={<LoadingFallback message="加载书源配置..." />}>
          <SourceSettingsModal
            isOpen={true} asPage={true}
            onClose={() => onSelectPage('discovery')}
          />
        </React.Suspense>
      )}
    </>
  )
}

export const App: React.FC = () => {
  const { books, fetchBooks, nav, tts, globalSearchInitQuery, handleBookDownloaded, handleResumeGlobalListening, handleOpenGlobalSearch } = useAppActions()
  const handleChapterChange = useCallback((ch: number) => nav.setChapterIndex(ch, true), [nav.setChapterIndex])
  const handleBackToShelf = useCallback(() => nav.closeReader(true), [nav.closeReader])
  const handleOpenDiscoveryFromReader = useCallback(() => { nav.closeReader(true); nav.setActivePage('discovery') }, [nav.closeReader, nav.setActivePage])
  const handleBooksChanged = useCallback(() => fetchBooks(true), [fetchBooks])
  const handleDismissCapsule = useCallback(() => {
    if (tts.audioStatus.playing) tts.triggerTogglePlayPause()
    tts.setListeningCapsuleDismissed(true)
  }, [tts])

  return (
    <ErrorBoundary name="AppRoot">
      {nav.activeBookId && (
        <React.Suspense fallback={<LoadingFallback message="正在初始化阅读器..." fullScreen />}>
          <ReaderWorkspace
            key={nav.activeBookId}
            activeBookId={nav.activeBookId} isHidden={!nav.isReaderOpen} resumeTtsNonce={tts.resumeTtsNonce}
            toggleTtsPlayPauseNonce={tts.toggleTtsPlayPauseNonce} openTtsModalNonce={tts.openTtsModalNonce}
            onGlobalTtsStatusChange={tts.setAudioStatus} onGlobalCheckpointSaved={tts.setCheckpoint}
            onChapterChange={handleChapterChange} jumpTarget={nav.jumpTarget} openTabBookIds={nav.openTabBookIds}
            allBooks={books} onSwitchBookTab={nav.switchBookTab} onCloseBookTab={nav.closeBookTab}
            onBackToShelf={handleBackToShelf} onOpenDiscovery={handleOpenDiscoveryFromReader} onBookStateUpdated={handleBooksChanged}
          />
        </React.Suspense>
      )}

      <div className={nav.isReaderOpen ? 'hidden' : 'min-h-screen bg-[#f7f8fa] flex flex-col'}>
        <DesktopHeader activePage={nav.activePage as NavPage} onSelectPage={nav.setActivePage} onOpenSearch={() => handleOpenGlobalSearch('')} />
        <main className="flex-1 flex flex-col w-full min-w-0 overflow-x-hidden pb-16 md:pb-0">
          <ErrorBoundary name={`Page:${nav.activePage}`}>
            <AppPageRouter
              activePage={nav.activePage} books={books} openTabBookIds={nav.openTabBookIds}
              globalSearchInitQuery={globalSearchInitQuery} onOpenBook={nav.openBook}
              onSelectPage={nav.setActivePage} onOpenGlobalSearch={handleOpenGlobalSearch}
              onBooksChanged={handleBooksChanged} onBookDownloaded={handleBookDownloaded}
              onCloseBookTab={nav.closeBookTab}
            />
          </ErrorBoundary>
        </main>
        <MobileBottomNav activePage={nav.activePage as NavPage} onSelectPage={nav.setActivePage} onOpenSearch={() => handleOpenGlobalSearch('')} />
        {!tts.listeningCapsuleDismissed && tts.audioStatus.active && (
          <GlobalListeningCapsule
            status={tts.audioStatus} checkpoint={tts.checkpoint} bookTitle={books.find((b) => b.id === (tts.audioStatus.bookId || nav.activeBookId))?.title}
            dismissed={tts.listeningCapsuleDismissed} onResumeListening={handleResumeGlobalListening}
            onTogglePlayPause={tts.triggerTogglePlayPause} onDismiss={handleDismissCapsule}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
