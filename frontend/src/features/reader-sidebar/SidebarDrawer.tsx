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
  const isDocked = Boolean(effectiveDock !== 'none' && canPin)
  const isLeftDock = effectiveDock === 'left'
  const closeIfOverlay = () => {
    if (!isDocked) onClose()
  }

  const safeToc = useMemo(() => (Array.isArray(toc) ? toc : []), [toc])
  const safeHighlights = useMemo(() => (Array.isArray(highlights) ? highlights : []), [highlights])
  const safeBookmarks = useMemo(() => (Array.isArray(bookmarks) ? bookmarks : []), [bookmarks])

  if (!isOpen) return null

  const drawerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        isDocked
          ? `w-[320px] lg:w-[350px] xl:w-[380px] shrink-0 h-full ${isLeftDock ? 'border-r' : 'border-l'} flex flex-col overflow-hidden z-20 ${
              isDark
                ? 'bg-[#1c1c1e] text-slate-100 border-white/10 shadow-[0_0_24px_rgba(0,0,0,0.4)]'
                : 'bg-white text-slate-900 border-slate-200/80 shadow-[0_0_24px_rgba(15,23,42,0.06)]'
            }`
          : `relative z-10 w-full sm:max-w-md h-dvh sm:h-full rounded-none sm:shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-[#1c1c1e] text-slate-100' : 'bg-white text-slate-900'
            }`
      }
    >
      <SidebarHeader
        book={book} tocCount={safeToc.length} highlightsCount={safeHighlights.length} bookmarksCount={safeBookmarks.length}
        isPinned={isPinned} canPin={canPin} onTogglePin={onTogglePin} dockSide={dockSide} onToggleDockSide={onToggleDockSide} onClose={onClose}
        activeTab={activeTab} onTabChange={onTabChange} isDark={isDark}
      />
      <SidebarActiveTabContent
        activeTab={activeTab} book={book} safeToc={safeToc} currentChapterIndex={currentChapterIndex}
        safeHighlights={safeHighlights} safeBookmarks={safeBookmarks} initialSearchQuery={initialSearchQuery}
        onSelectChapter={onSelectChapter} onDeleteHighlight={onDeleteHighlight} onDeleteBookmark={onDeleteBookmark}
        closeIfOverlay={closeIfOverlay} isDark={isDark}
        dockSide={dockSide} onToggleDockSide={onToggleDockSide}
      />
    </div>
  )

  if (isDocked) return drawerContent

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/45 backdrop-blur-xs"
    >
      {drawerContent}
    </div>
  )
}

export default SidebarDrawer
