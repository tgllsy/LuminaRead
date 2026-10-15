export interface HighlightItem {
  id: string
  book_id: string
  book_title?: string
  book_author?: string
  cover_url?: string
  cover_color?: string
  category?: string
  chapter_index: number
  chapter_title: string
  selected_text: string
  paragraph_index: number
  end_paragraph_index?: number
  start_offset: number
  end_offset: number
  cfi_range: string
  style_type: 'marker' | 'wavy' | 'underline'
  color: 'yellow' | 'blue' | 'pink' | 'green' | 'purple'
  note: string
  created_at: string
  updated_at: string
}

export interface BookmarkItem {
  id: string
  book_id: string
  book_title?: string
  book_author?: string
  cover_url?: string
  cover_color?: string
  chapter_index: number
  chapter_title: string
  snippet: string
  percentage: number
  scroll_offset: number
  created_at: string
}

export interface AIConversationItem {
  id: string
  book_id: string
  book_title: string
  book_author: string
  cover_url?: string
  cover_color: string
  chapter_index: number
  chapter_title: string
  paragraph_index: number
  selected_text: string
  mode: 'explain' | 'example' | 'socratic' | 'bilingual' | 'custom'
  question: string
  answer_title: string
  answer_content: string
  engine: string
  follow_ups: string[]
  is_pinned: boolean
  saved_highlight_id?: string
  created_at: string
  updated_at: string
}

export interface NotesHubOverviewResponse {
  stats: {
    total_highlights: number
    total_notes: number
    total_bookmarks: number
    total_ai_conversations: number
    books_with_records: number
  }
  highlights: HighlightItem[]
  bookmarks: BookmarkItem[]
  ai_conversations: AIConversationItem[]
}
