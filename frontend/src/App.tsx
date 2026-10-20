import React, { useCallback } from 'react'
import type { AppNavPage } from './app/types'
import { ErrorBoundary, LoadingFallback } from './shared/ui'
import { DesktopHeader, type NavPage } from './app/components/DesktopHeader'
import { MobileAppBar } from './app/components/MobileAppBar'
import { MobileBottomNav } from './app/components/MobileBottomNav'
import { GlobalListeningCapsule } from './app/components/GlobalListeningCapsule'
import { AppPageRouter } from './app/components/AppPageRouter'
import { useAppActions } from './app/hooks/useAppActions'

export type { AppNavPage }

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

export const App: React.FC = () => {
  const {
    books,
    fetchBooks,
    nav,
    tts,
    globalSearchInitQuery,
    handleBookDownloaded,
    handleResumeGlobalListening,
    handleSelectNavPage,
    handleOpenGlobalSearch,
  } = useAppActions()

  const handleChapterChange = useCallback(
    (ch: number) => nav.setChapterIndex(ch, true),
    [nav.setChapterIndex]
  )
  const handleBackToShelf = useCallback(() => {
    nav.closeReader(true)
    fetchBooks(true)
  }, [nav.closeReader, fetchBooks])
  const handleOpenDiscoveryFromReader = useCallback(() => {
    nav.closeReader(true)
    nav.setActivePage('discovery')
  }, [nav.closeReader, nav.setActivePage])
  const handleBooksChanged = useCallback(() => fetchBooks(true), [fetchBooks])

  const handleDismissCapsule = useCallback(() => {
    if (tts.audioStatus.playing) tts.triggerTogglePlayPause()
    tts.setListeningCapsuleDismissed(true)
    tts.setAudioStatus({
      active: false,
      playing: false,
      paused: false,
      loading: false,
      ambientActive: false,
    })
  }, [tts.audioStatus.playing, tts.triggerTogglePlayPause, tts.setListeningCapsuleDismissed, tts.setAudioStatus])

  const triggerGlobalFileUpload = useCallback(() => {
    if (nav.activePage !== 'shelf') {
      nav.setActivePage('shelf')
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>('input[data-lumina-book-upload="true"], input[type="file"]')?.click()
      }, 60)
      return
    }
    document.querySelector<HTMLInputElement>('input[data-lumina-book-upload="true"], input[type="file"]')?.click()
  }, [nav.activePage, nav.setActivePage])

  return (
    <ErrorBoundary name="AppRoot">
      {nav.activeBookId && (
        <React.Suspense fallback={<LoadingFallback message="正在初始化阅读器..." fullScreen />}>
          <ReaderWorkspace
            key={nav.activeBookId}
            activeBookId={nav.activeBookId}
            isHidden={!nav.isReaderOpen}
            resumeTtsNonce={tts.resumeTtsNonce}
            toggleTtsPlayPauseNonce={tts.toggleTtsPlayPauseNonce}
            openTtsModalNonce={tts.openTtsModalNonce}
            onGlobalTtsStatusChange={tts.setAudioStatus}
            onGlobalCheckpointSaved={tts.setCheckpoint}
            onChapterChange={handleChapterChange}
            jumpTarget={nav.jumpTarget}
            openTabBookIds={nav.openTabBookIds}
            allBooks={books}
            onSwitchBookTab={nav.switchBookTab}
            onCloseBookTab={nav.closeBookTab}
            onBackToShelf={handleBackToShelf}
            onOpenDiscovery={handleOpenDiscoveryFromReader}
            onBookStateUpdated={handleBooksChanged}
          />
        </React.Suspense>
      )}
      <div className={nav.isReaderOpen ? 'hidden' : 'min-h-dvh bg-[#f7f8fa] flex flex-col'}>
        <DesktopHeader
          activePage={nav.activePage as NavPage}
          onSelectPage={handleSelectNavPage}
          onOpenSearch={() => handleOpenGlobalSearch('')}
          onTriggerUpload={triggerGlobalFileUpload}
        />
        <MobileAppBar
          activePage={nav.activePage as NavPage}
          onSelectPage={handleSelectNavPage}
          onOpenSearch={() => handleOpenGlobalSearch('')}
          onTriggerUpload={triggerGlobalFileUpload}
        />
        <main
          className={`flex-1 flex flex-col w-full min-w-0 overflow-x-hidden ${
            !tts.listeningCapsuleDismissed && tts.audioStatus.active
              ? 'pb-[calc(8.25rem+env(safe-area-inset-bottom,0px))] md:pb-0'
              : 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
          }`}
        >
          <ErrorBoundary name={`Page:${nav.activePage}`}>
            <AppPageRouter
              activePage={nav.activePage}
              books={books}
              openTabBookIds={nav.openTabBookIds}
              globalSearchInitQuery={globalSearchInitQuery}
              onOpenBook={nav.openBook}
              onSelectPage={handleSelectNavPage}
              onOpenGlobalSearch={handleOpenGlobalSearch}
              onBooksChanged={handleBooksChanged}
              onBookDownloaded={handleBookDownloaded}
              onCloseBookTab={nav.closeBookTab}
            />
          </ErrorBoundary>
        </main>
        <MobileBottomNav
          activePage={nav.activePage as NavPage}
          onSelectPage={handleSelectNavPage}
          onOpenSearch={() => handleOpenGlobalSearch('')}
          onTriggerUpload={triggerGlobalFileUpload}
        />
        {!tts.listeningCapsuleDismissed && tts.audioStatus.active && (
          <GlobalListeningCapsule
            status={tts.audioStatus}
            checkpoint={tts.checkpoint}
            bookTitle={books.find((b) => b.id === (tts.audioStatus.bookId || nav.activeBookId))?.title}
            dismissed={tts.listeningCapsuleDismissed}
            onResumeListening={handleResumeGlobalListening}
            onTogglePlayPause={tts.triggerTogglePlayPause}
            onDismiss={handleDismissCapsule}
            onOpenTheater={() => handleResumeGlobalListening(true)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
