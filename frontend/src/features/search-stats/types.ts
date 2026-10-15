import type {
  BookSummary,
  HighlightItem,
  JumpTarget,
  FullTextChapterHit,
  FullTextSearchResponse,
} from '../../types'

export interface HeatmapCell {
  date: string
  minutes: number
  words: number
  level: number
}

export interface StatsOverview {
  total_reading_seconds: number
  total_reading_hours: number
  today_reading_minutes: number
  total_books: number
  reading_books: number
  finished_books: number
  total_words_in_library: number
  highlights_count: number
  notes_count: number
  streak_days: number
  heatmap: HeatmapCell[]
}

export interface ExportMarkdownResponse {
  book_id: string
  filename?: string
  markdown: string
  highlights_count?: number
  ai_conversations_count?: number
}

export interface SyncLifeOsResponse {
  success?: boolean
  lifeos_online?: boolean
  note_id?: string
  synced_at?: string
  target?: string
  cards_created?: number
  summary?: string
  error?: string
}

export interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
  onJumpToResult: (target: JumpTarget) => void
  asPage?: boolean
}

export interface ReadingStatsModalProps {
  isOpen: boolean
  onClose: () => void
  books: BookSummary[]
  asPage?: boolean
}

export type {
  BookSummary,
  HighlightItem,
  JumpTarget,
  FullTextChapterHit,
  FullTextSearchResponse,
}
