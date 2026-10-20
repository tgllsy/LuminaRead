import React, { useState, useEffect } from 'react'
import type { JumpTarget } from '../../types'
import type { AppNavPage } from '../types'
import { BookshelfView } from '../../features/bookshelf'
import { LoadingFallback } from '../../shared/ui'
import type { useBooksStore } from '../../shared/stores/useBooksStore'

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

const BookDiscoveryModal = lazyWithRetry(() =>
  import('../../features/discovery').then((m) => ({ default: m.BookDiscoveryModal }))
)
const SourceSettingsModal = lazyWithRetry(() =>
  import('../../features/discovery').then((m) => ({ default: m.SourceSettingsModal }))
)
const ReadingStatsModal = lazyWithRetry(() =>
  import('../../features/search-stats').then((m) => ({ default: m.ReadingStatsModal }))
)
const GlobalSearchModal = lazyWithRetry(() =>
  import('../../features/search-stats').then((m) => ({ default: m.GlobalSearchModal }))
)
const NotesAndAICenterView = lazyWithRetry(() =>
  import('../../features/notes').then((m) => ({ default: m.NotesAndAICenterView }))
)
const BlackGoldTheaterModal = lazyWithRetry(() =>
  import('../../features/audio-tts').then((m) => ({ default: m.BlackGoldTheaterModal }))
)

export interface AppPageRouterProps {
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
}

export const AppPageRouter: React.FC<AppPageRouterProps> = ({
  activePage,
  books,
  openTabBookIds,
  globalSearchInitQuery,
  onOpenBook,
  onSelectPage,
  onOpenGlobalSearch,
  onBooksChanged,
  onBookDownloaded,
  onCloseBookTab,
}) => {
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ shelf: true })

  useEffect(() => {
    if (!visitedTabs[activePage]) {
      setVisitedTabs((prev) => ({ ...prev, [activePage]: true }))
    }
  }, [activePage, visitedTabs])

  return (
    <>
      <div className={activePage === 'shelf' ? 'flex-1 flex flex-col w-full' : 'hidden'}>
        <BookshelfView
          books={books}
          openTabBookIds={openTabBookIds}
          onOpenBook={onOpenBook}
          onOpenDiscovery={() => onSelectPage('discovery')}
          onOpenSourceSettings={() => onSelectPage('sources')}
          onOpenStats={() => onSelectPage('stats')}
          onOpenNotesHub={() => onSelectPage('notes')}
          onOpenGlobalSearch={onOpenGlobalSearch}
          onBooksChanged={onBooksChanged}
          onCloseBookTab={onCloseBookTab}
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
              isOpen={true}
              asPage={true}
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
            isOpen={true}
            asPage={true}
            onClose={() => onSelectPage('shelf')}
            initialQuery={globalSearchInitQuery}
            onJumpToResult={onOpenBook}
          />
        </React.Suspense>
      )}
      {activePage === 'stats' && (
        <React.Suspense fallback={<LoadingFallback message="加载阅读统计..." />}>
          <ReadingStatsModal
            isOpen={true}
            asPage={true}
            onClose={() => onSelectPage('shelf')}
            books={books}
          />
        </React.Suspense>
      )}
      {activePage === 'sources' && (
        <React.Suspense fallback={<LoadingFallback message="加载书源配置..." />}>
          <SourceSettingsModal
            isOpen={true}
            asPage={true}
            onClose={() => onSelectPage('discovery')}
          />
        </React.Suspense>
      )}
      {activePage === 'tts' && (
        <React.Suspense fallback={<LoadingFallback message="加载听书大剧场..." />}>
          <BlackGoldTheaterModal
            isOpen={true}
            onClose={() => onSelectPage('shelf')}
            onOpenReader={(bookId) => onOpenBook({ bookId, chapterIndex: 0 })}
            books={books}
          />
        </React.Suspense>
      )}
    </>
  )
}
