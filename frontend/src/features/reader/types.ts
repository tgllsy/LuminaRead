import type React from 'react'
import type {
  BookSummary,
  BookFullContent,
  HighlightItem,
  BookmarkItem,
  ReaderTypography,
  JumpTarget,
  PdfBookMeta,
  BookChapter,
} from '../../types'
import type { PageSpread, PageSliceItem } from '../../utils/paginationEngine'
import type {
  TtsAudioStatus,
  TtsCheckpoint,
} from '../audio-tts'

export interface ReaderWorkspaceProps {
  activeBookId: string
  isHidden?: boolean
  resumeTtsNonce?: number
  toggleTtsPlayPauseNonce?: number
  openTtsModalNonce?: number
  onGlobalTtsStatusChange?: (status: TtsAudioStatus) => void
  onGlobalCheckpointSaved?: (cp: TtsCheckpoint) => void
  onChapterChange?: (chapterIndex: number) => void
  jumpTarget: JumpTarget | null
  openTabBookIds: string[]
  allBooks: BookSummary[]
  onSwitchBookTab: (bookId: string) => void
  onCloseBookTab: (bookId: string) => void
  onBackToShelf: () => void
  onOpenDiscovery: () => void
  onBookStateUpdated: () => void
}

export type PdfMode = 'hybrid' | 'page_canvas' | 'text_only'
export type PdfSpreadMode = 'single' | 'double'

export type ParagraphSemanticStyle =
  | 'normal'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'subheading'
  | 'caption'
  | 'attribution'
  | 'blockquote'
  | 'list_item'
  | 'code_block'
  | 'divider'
  | 'meta_line'

export interface SelectionState {
  text: string
  paragraphIndex: number
  endParagraphIndex?: number
  startOffset?: number
  endOffset?: number
  chapterIndex?: number
  existing?: HighlightItem | null
  openNoteEditorInitially?: boolean
  anchorRect?: import('../reader-controls/types').SelectionAnchorRect | null
}


export interface FootnoteModalState {
  rawMarker: string
  key: string
  footnoteText: string
  targetChapterIndex: number
  targetChapterTitle: string
  targetParagraphIndex: number
  sourceParagraphIndex: number
  bibChapterIndex: number
}

export interface EntityWikiModalState {
  isOpen: boolean
  entityName: string
  anchorRect?: import('../reader-controls/types').SelectionAnchorRect | null
}

export interface ReturnAnchorState {
  chapterIndex: number
  paragraphIndex: number
  scrollY: number
  label: string
}

export interface CopilotModalState {
  isOpen: boolean
  mode: 'spoiler_free_recap' | 'explain' | 'example' | 'socratic' | 'bilingual'
  text: string
  paragraphIndex?: number
}

export interface PosterModalState {
  text: string
  note?: string
}

export interface LightboxImageState {
  url: string
  title: string
  pageNum?: number
}

export interface PlayParagraphRequest {
  nonce: number
  chapterIndex: number
  paragraphIndex: number
}

export type ScrollTarget =
  | { type: 'top' }
  | { type: 'none' }
  | { type: 'para'; index: number; fallbackScrollY?: number }
  | { type: 'offset'; top: number }

export type {
  BookSummary,
  BookFullContent,
  HighlightItem,
  BookmarkItem,
  ReaderTypography,
  JumpTarget,
  PdfBookMeta,
  BookChapter,
  PageSpread,
  PageSliceItem,
  TtsAudioStatus,
  TtsCheckpoint,
}

export interface UseReaderChapterSelectOptions {
  contentData: BookFullContent | null
  setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>>
  chapterIndex: number
  setChapterIndex: (idx: number) => void
  setConnectedChapterIndices: (cb: (prev: number[]) => number[]) => void
  setPdfCanvasPage: (page: number) => void
  setReturnAnchor: (anchor: ReturnAnchorState | null) => void
  setSelectionState: (v: null) => void
  setFootnoteModal: (v: null) => void
  setFlashedParaIndex: (v: number | null) => void
  setHighlightKeyword: (v: string) => void
  reportProgress: (ch: number, offset: number, pct: number, delta?: number) => Promise<any>
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  isHidden?: boolean
  jumpTarget?: JumpTarget | null
}
