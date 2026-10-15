import type { HighlightItem } from './notes'

export interface FullTextChapterHit {
  id: string
  book_id: string
  book_title: string
  book_author: string
  cover_color: string
  chapter_index: number
  chapter_title: string
  paragraph_index: number
  char_offset: number
  match_offset_in_para: number
  match_count: number
  snippet_before: string
  match_text: string
  snippet_after: string
  full_paragraph: string
}

export interface FullTextSearchResponse {
  query: string
  elapsed_ms: number
  engine: string
  total_matches: number
  books_matched: number
  chapter_hits: FullTextChapterHit[]
  highlight_hits: HighlightItem[]
}
