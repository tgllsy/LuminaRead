import type {
  BookSummary,
  HighlightItem,
  BookmarkItem,
  AIConversationItem,
  NotesHubOverviewResponse,
  JumpTarget,
} from '../../types'

export type NotesSubTab = 'all' | 'notes' | 'highlights' | 'ai' | 'bookmarks'

export interface NotesAndAICenterViewProps {
  books: BookSummary[]
  onOpenBook: (target: JumpTarget) => void
  onBooksChanged: () => void
  initialSubTab?: NotesSubTab
  initialBookId?: string
}

export interface NotesFilterState {
  activeSubTab: NotesSubTab
  selectedBookId: string
  searchQuery: string
  colorFilter: string
  styleFilter: string
  aiModeFilter: string
}

export interface CreateNotePayload {
  bookId: string
  chapterIndex: number
  chapterTitle: string
  quote: string
  note: string
  color: HighlightItem['color']
  style: HighlightItem['style_type']
}

export interface AskAiPayload {
  bookId: string
  chapterIndex: number
  chapterTitle: string
  selectedText: string
  mode: AIConversationItem['mode']
  question: string
}

export type {
  BookSummary,
  HighlightItem,
  BookmarkItem,
  AIConversationItem,
  NotesHubOverviewResponse,
  JumpTarget,
}
