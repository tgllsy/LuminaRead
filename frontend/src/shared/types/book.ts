import type { HighlightItem, BookmarkItem } from './notes'

export interface ReadingProgress {
  book_id: string
  chapter_index: number
  scroll_offset: number
  cfi: string
  percentage: number
  device_name: string
  updated_at: string
}

export interface ReadingLibrary {
  id: string
  name: string
  icon: string
  color: string
  description: string
  sort_order: number
  is_default?: number | boolean
  book_count?: number
  created_at: string
}

export interface PdfPageMetaItem {
  page_num: number
  width: number
  height: number
  has_image: boolean
  has_text: boolean
  text_preview: string
  text?: string
}

export interface PdfBookMeta {
  book_id: string
  title: string
  total_pages: number
  totalPages?: number
  text_page_count: number
  image_page_count: number
  is_scanned_or_hybrid: boolean
  is_scanned_book?: boolean
  pages: PdfPageMetaItem[]
}

export interface BookSummary {
  id: string
  title: string
  author: string
  cover_url: string
  cover_color: string
  isbn: string
  publisher: string
  publish_year: string
  source_type: 'local' | 'zlib' | 'zlibrary' | 'annas' | 'annas_archive' | 'gutenberg' | 'openlibrary' | 'opds'
  format: string
  file_path: string
  file_url?: string
  file_size: number
  word_count: number
  category: string
  library_id?: string
  tags: string[]
  status: 'unread' | 'reading' | 'finished' | 'importing' | 'error'
  import_progress?: number
  import_step?: string
  import_error?: string
  total_reading_seconds: number
  last_read_at: string
  description: string
  created_at: string
  chapters_count: number
  highlights_count: number
  bookmarks_count: number
  progress: ReadingProgress
}

export interface BookChapter {
  id: string
  title: string
  content: string
  wordCount: number
  order: number
  pageStart?: number
  pageEnd?: number
  totalPages?: number
  isPdfHybrid?: boolean
  _partial?: boolean
}

export interface JumpTarget {
  bookId: string
  chapterIndex: number
  paragraphIndex?: number
  highlightKeyword?: string
  scrollOffset?: number
}

export interface BookFullContent {
  book: BookSummary
  toc: Array<{ id: string; index: number; title: string; wordCount: number }>
  chapters: BookChapter[]
  is_lite?: boolean
  progress: ReadingProgress
  highlights: HighlightItem[]
  bookmarks: BookmarkItem[]
}
