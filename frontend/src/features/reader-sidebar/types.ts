import type {
  BookSummary,
  HighlightItem,
  BookmarkItem,
  FullTextSearchResponse,
  FullTextChapterHit,
  ReaderTypography,
} from '../../types'

export type SidebarDrawerTab = 'toc' | 'search' | 'notes' | 'bookmarks' | 'highlights'
export type SidebarTab = SidebarDrawerTab

export interface TocItem {
  id: string
  index: number
  title: string
  wordCount: number
}

export type NotesViewMode = 'list' | 'mindmap'

export interface MindmapLeaf {
  hl: HighlightItem
  hy: number
}

export interface MindmapNode {
  ch: TocItem
  cy: number
  leaves: MindmapLeaf[]
}

export interface MindmapLayout {
  nodes: MindmapNode[]
  totalHeight: number
  rootY: number
}

export interface ExportMarkdownResponse {
  markdown?: string
  filename?: string
}

export interface SyncLifeOsResponse {
  summary?: string
}

export interface SidebarDrawerProps {
  isOpen: boolean
  isPinned?: boolean
  canPin?: boolean
  onTogglePin?: () => void
  dockSide?: 'left' | 'right' | 'none'
  onToggleDockSide?: (side: 'left' | 'right' | 'none') => void
  theme?: ReaderTypography['theme']
  activeTab: 'toc' | 'search' | 'notes' | 'bookmarks' | 'highlights'
  onTabChange: (tab: 'toc' | 'search' | 'notes' | 'bookmarks') => void
  onClose: () => void
  book: BookSummary
  toc: TocItem[]
  currentChapterIndex: number
  highlights: HighlightItem[]
  bookmarks: BookmarkItem[]
  initialSearchQuery?: string
  onSelectChapter: (
    chapterIndex: number,
    paragraphIndex?: number,
    keyword?: string
  ) => void
  onDeleteHighlight: (id: string) => void
  onDeleteBookmark: (id: string) => void
}

export type {
  BookSummary,
  HighlightItem,
  BookmarkItem,
  FullTextSearchResponse,
  FullTextChapterHit,
  ReaderTypography,
}
