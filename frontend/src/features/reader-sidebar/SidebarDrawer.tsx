import React, { useMemo } from 'react'
import type { SidebarDrawerProps } from './types'
import {
  SidebarHeader,
  TocTab,
  SearchInBookTab,
  HighlightsTab,
  BookmarksTab,
} from './components'

const SidebarActiveTabContent: React.FC<{
  activeTab: SidebarDrawerProps['activeTab']
  book: SidebarDrawerProps['book']
  safeToc: NonNullable<SidebarDrawerProps['toc']>
  currentChapterIndex: number
  safeHighlights: NonNullable<SidebarDrawerProps['highlights']>
  safeBookmarks: NonNullable<SidebarDrawerProps['bookmarks']>
  initialSearchQuery: string
  onSelectChapter: SidebarDrawerProps['onSelectChapter']
  onDeleteHighlight: SidebarDrawerProps['onDeleteHighlight']
  onDeleteBookmark: SidebarDrawerProps['onDeleteBookmark']
  closeIfOverlay: () => void
  isDark: boolean
  dockSide?: 'left' | 'right' | 'none'
  onToggleDockSide?: (side: 'left' | 'right' | 'none') => void
}> = ({
  activeTab, book, safeToc, currentChapterIndex, safeHighlights, safeBookmarks,
  initialSearchQuery, onSelectChapter, onDeleteHighlight, onDeleteBookmark, closeIfOverlay, isDark,
  dockSide, onToggleDockSide,
}) => (
  <>
    {activeTab === 'toc' && (
      <TocTab
        toc={safeToc}
        currentChapterIndex={currentChapterIndex}
        onSelectChapter={onSelectChapter}
        onCloseIfOverlay={closeIfOverlay}
        isDark={isDark}
        dockSide={dockSide}
        onToggleDockSide={onToggleDockSide}
      />
    )}
    {activeTab === 'search' && (
      <SearchInBookTab bookId={book.id} initialQuery={initialSearchQuery} onSelectChapter={onSelectChapter} onCloseIfOverlay={closeIfOverlay} isDark={isDark} />
    )}
    {(activeTab === 'notes' || activeTab === 'highlights') && (
      <HighlightsTab book={book} toc={safeToc} highlights={safeHighlights} onSelectChapter={onSelectChapter} onDeleteHighlight={onDeleteHighlight} onCloseIfOverlay={closeIfOverlay} isDark={isDark} />
    )}
    {activeTab === 'bookmarks' && (
      <BookmarksTab bookmarks={safeBookmarks} onSelectChapter={onSelectChapter} onDeleteBookmark={onDeleteBookmark} onCloseIfOverlay={closeIfOverlay} isDark={isDark} />
    )}
  </>
)

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen, isPinned = false, canPin = false, onTogglePin, dockSide, onToggleDockSide, theme = 'light',
  activeTab, onTabChange, onClose, book, toc, currentChapterIndex,
  highlights, bookmarks, initialSearchQuery = '',
  onSelectChapter, onDeleteHighlight, onDeleteBookmark,
}) => {
  const isDark = theme === 'dark'
  const effectiveDock = dockSide ?? (isPinned ? 'right' : 'none')
  const isDocked = Boolean(effectiveDock !== 'none' && isPinned && canPin)
  const isLeftDock = effectiveDock === 'left'
  const closeIfOverlay = () => {
    if (!isDocked) onClose()
  }

  const safeToc = useMemo(() => (Array.isArray(toc) ? toc : []), [toc])
  const safeHighlights = useMemo(() => (Array.isArray(highlights) ? highlights : []), [highlights])
  const safeBookmarks = useMemo(() => (Array.isArray(bookmarks) ? bookmarks : []), [bookmarks])

  if (!isOpen) return null

  const drawerContent = (
    <aside
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      className={`fixed top-0 bottom-0 ${
        isLeftDock ? 'left-0 border-r' : 'right-0 border-l'
      } w-full sm:w-[340px] lg:w-[360px] xl:w-[380px] h-screen z-50 flex flex-col overflow-hidden shadow-2xl transition-transform duration-200 select-text ${
        isDark
          ? 'bg-[#1c1c1e] text-slate-100 border-white/10 shadow-[0_0_32px_rgba(0,0,0,0.5)]'
          : 'bg-white text-slate-900 border-slate-200/90 shadow-[0_0_32px_rgba(15,23,42,0.12)]'
      }`}
    >
      <SidebarHeader
        book={book} tocCount={safeToc.length} highlightsCount={safeHighlights.length} bookmarksCount={safeBookmarks.length}
        isPinned={isPinned} canPin={canPin} onTogglePin={onTogglePin} dockSide={dockSide} onToggleDockSide={onToggleDockSide} onClose={onClose}
        activeTab={activeTab} onTabChange={onTabChange} isDark={isDark}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SidebarActiveTabContent
          activeTab={activeTab} book={book} safeToc={safeToc} currentChapterIndex={currentChapterIndex}
          safeHighlights={safeHighlights} safeBookmarks={safeBookmarks} initialSearchQuery={initialSearchQuery}
          onSelectChapter={onSelectChapter} onDeleteHighlight={onDeleteHighlight} onDeleteBookmark={onDeleteBookmark}
          closeIfOverlay={closeIfOverlay} isDark={isDark}
          dockSide={dockSide} onToggleDockSide={onToggleDockSide}
        />
      </div>
    </aside>
  )

  if (isDocked) return drawerContent

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
    >
      {drawerContent}
    </div>
  )
}

export default SidebarDrawer
