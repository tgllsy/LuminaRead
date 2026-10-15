import type { BookSummary, JumpTarget, ReadingLibrary } from '../../types'

export interface BookshelfViewProps {
  books: BookSummary[]
  openTabBookIds: string[]
  onOpenBook: (target: JumpTarget) => void
  onOpenDiscovery: () => void
  onOpenSourceSettings?: () => void
  onOpenStats: () => void
  onOpenGlobalSearch: (initialQuery?: string) => void
  onOpenNotesHub?: () => void
  onBooksChanged: () => void
  onCloseBookTab?: (bookId: string) => void
}

export type BookshelfViewMode = 'grid' | 'list'

export interface BookshelfFilterState {
  statusFilter: string
  libraryFilter: string
  categoryFilter: string
  viewMode: BookshelfViewMode
  localFilterText: string
}

export interface LibraryFormData {
  id?: string
  name: string
  description: string
  icon: string
  color: string
}

export interface BookOrganizeFormData {
  book: BookSummary
  libraryId: string
  category: string
  tagsText: string
}

export interface UploadAlertItem {
  id: string
  filename: string
  message: string
  bookId?: string
}

export type { BookSummary, JumpTarget, ReadingLibrary }
