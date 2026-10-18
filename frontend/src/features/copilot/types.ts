import type { BookSummary, ReaderTypography } from '../../types'

export type CopilotLayoutMode = 'studio' | 'modal' | 'dock-right' | 'dock-left'

export type CognitiveMode = 'socratic' | 'causal_graph' | 'intertextual'

export type CopilotMode =
  | 'spoiler_free_recap'
  | 'book_rag'
  | 'explain'
  | 'example'
  | 'socratic'
  | 'bilingual'
  | 'intertextual'
  | 'custom'

export type CopilotChatMode =
  | 'book_rag'
  | 'explain'
  | 'example'
  | 'socratic'
  | 'bilingual'
  | 'intertextual'
  | 'custom'

export interface SemanticNode {
  id: string
  label: string
  category?: 'mechanism' | 'entity' | 'concept'
}

export interface IntertextualBookComparison {
  relatedBookTitle: string
  relatedAuthor: string
  chapterContext: string
  quote: string
  dimension: string
  currentBookView: string
  relatedBookView: string
  currentBookPerspective?: string
  relatedBookPerspective?: string
}

export interface CharacterNode {
  id: string
  name: string
  role: string
  firstSeenChapter: number
  traits: string[]
  statusUpToNow: string
  keyEvents: string[]
}

export interface CharacterEdge {
  source: string
  target: string
  relation: string
}

export interface RecapPoint {
  chapter_index: number
  chapter_title: string
  summary: string
  key_quote: string
}

export interface SpoilerFreeRecapData {
  book_id: string
  book_title: string
  current_chapter_index: number
  total_chapters: number
  visible_chapters_count: number
  hidden_chapters_count: number
  spoiler_lock_badge: string
  recap_points: RecapPoint[]
  character_graph: {
    nodes: CharacterNode[]
    edges: CharacterEdge[]
  }
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  title?: string
  mode?: CopilotChatMode
  follow_ups?: string[]
  citations?: Array<{
    chapter_index: number
    chapter_title: string
    paragraph_index: number
    snippet: string
  }>
  timestamp: number
  selectedText?: string
  isError?: boolean
}

export interface CopilotQueryPayload {
  mode: CopilotChatMode
  book_id: string
  book_title?: string
  chapter_index?: number
  chapter_title?: string
  paragraph_index?: number
  selected_text?: string
  question?: string
  skip_log?: boolean
  force_new?: boolean
  history?: ChatHistoryItem[]
}

export interface CopilotRecapPayload {
  mode: 'spoiler_free_recap'
  book_id: string
  current_chapter_index: number
  current_percentage?: number
}

export interface CopilotResponse {
  title: string
  content: string
  follow_ups: string[]
  conversation_id?: string | null
  engine?: string
  isError?: boolean
  citations?: Array<{
    chapter_index: number
    chapter_title: string
    paragraph_index: number
    snippet: string
  }>
}

export interface CopilotPromptPreset {
  id: CopilotChatMode
  label: string
}

export interface AICopilotModalProps {
  isOpen: boolean
  onClose: () => void
  book: BookSummary
  currentChapterIndex: number
  currentChapterTitle: string
  chapterExcerpt?: string
  chapterText?: string
  theme?: ReaderTypography['theme']
  initialMode?:
    | 'spoiler_free_recap'
    | 'explain'
    | 'example'
    | 'socratic'
    | 'bilingual'
    | 'intertextual'
  selectedText?: string
  paragraphIndex?: number
  onSaveInsightAsNote: (text: string, noteContent: string) => void
  onJumpToCitation?: (chapterIndex: number, paragraphIndex: number) => void
}
