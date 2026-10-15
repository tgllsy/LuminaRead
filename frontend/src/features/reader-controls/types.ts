import type React from 'react'
import type { ReaderTypography, HighlightItem } from '../../types'

export type { ReaderTypography, HighlightItem }

export type WeReadBottomTab = 'progress' | 'theme' | 'font'

export interface FontItem {
  id: ReaderTypography['fontFamily']
  label: string
  shortLabel: string
  className: string
}

export interface ThemeColorOption {
  theme: ReaderTypography['theme']
  bgTexture: NonNullable<ReaderTypography['bgTexture']>
  label: string
  bgClass: string
  borderActive: string
  borderNormal: string
  showMoonIcon?: boolean
}

export interface BgTextureOption {
  theme: ReaderTypography['theme']
  bgTexture: NonNullable<ReaderTypography['bgTexture']>
  title: string
  bgClass: string
  borderActive: string
  borderNormal: string
  badgeText?: string
}

export interface SelectionAnchorRect {
  top: number
  left: number
  bottom: number
  width: number
}

export interface HighlightColorItem {
  id: HighlightItem['color']
  label: string
  dot: string
}

export interface HighlightStyleItem {
  id: HighlightItem['style_type']
  label: string
}

export interface HighlightPayload {
  color: HighlightItem['color']
  style_type: HighlightItem['style_type']
  note: string
}

export type CopilotAskMode = 'explain' | 'example' | 'socratic' | 'bilingual'

export interface TypographyPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: ReaderTypography
  onChange: (patch: Partial<ReaderTypography>) => void
  activeTab?: WeReadBottomTab
  onTabChange?: (tab: WeReadBottomTab) => void
  chapterIndex?: number
  totalChapters?: number
  chapterTitle?: string
  progressPercent?: number
  onSelectChapter?: (idx: number) => void
  onOpenToc?: () => void
  onOpenNotesOrIdeas?: () => void
  onOpenAI?: () => void
  onOpenTTS?: () => void
  isTtsActive?: boolean
  getChapterTitle?: (idx: number) => string
  bookId?: string
}

export interface SelectionPopoverProps {
  selectedText: string
  paragraphIndex: number
  existingHighlight?: HighlightItem | null
  openNoteEditorInitially?: boolean
  anchorRect?: SelectionAnchorRect | null
  theme?: ReaderTypography['theme']
  onClose: () => void
  onCreateOrUpdateHighlight: (payload: HighlightPayload) => void
  onDeleteHighlight?: (id: string) => void
  onAskAICopilot: (text: string, mode: CopilotAskMode) => void
  onSearchInBook: (text: string) => void
  onGeneratePoster: (text: string, note?: string) => void
  onStartTTSFromParagraph?: (paragraphIndex: number) => void
}

export interface ProgressScrubberTabProps {
  chapterIndex: number
  totalChapters: number
  chapterTitle: string
  progressPercent: number
  isDark: boolean
  onSelectChapter?: (idx: number) => void
  getChapterTitle?: (idx: number) => string
  bookId?: string
}

export interface ThemeColorPickerTabProps {
  isDark: boolean
  brightness: number
  theme: ReaderTypography['theme']
  bgTexture: string
  brClamped: number
  brRatio: number
  onChange: (patch: Partial<ReaderTypography>) => void
}

export interface FontLayoutSettingsTabProps {
  isDark: boolean
  settings: ReaderTypography
  onChange: (patch: Partial<ReaderTypography>) => void
  showFontDrawer: boolean
  setShowFontDrawer: React.Dispatch<React.SetStateAction<boolean>>
  fontRatio: number
  fontClamped: number
  marginRatio: number
  lhRatio: number
  lhClamped: number
  currentFontMeta: FontItem
}

export interface DesktopPanelHeaderProps {
  currentTab: WeReadBottomTab
  setTab: (tab: WeReadBottomTab) => void
  onClose: () => void
  isDark: boolean
}

export interface MobileBottomNavBarProps {
  currentTab: WeReadBottomTab
  setTab: (tab: WeReadBottomTab) => void
  isDark: boolean
  onClose: () => void
  onOpenToc?: () => void
  onOpenNotesOrIdeas?: () => void
  onOpenAI?: () => void
  onOpenTTS?: () => void
  isTtsActive?: boolean
}

export interface HighlightColorPickerProps {
  color: HighlightItem['color']
  styleType: HighlightItem['style_type']
  isDark: boolean
  onSelectColor: (c: HighlightItem['color']) => void
  onSelectStyle: (st: HighlightItem['style_type']) => void
}

export interface SelectionActionPillsProps {
  selectedText: string
  paragraphIndex: number
  note: string
  showNoteInput: boolean
  setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>
  copied: boolean
  existingHighlight?: HighlightItem | null
  pillBtnClass: string
  onStartTTSFromParagraph?: (paragraphIndex: number) => void
  onAskAICopilot: (text: string, mode: CopilotAskMode) => void
  onSearchInBook: (text: string) => void
  onGeneratePoster: (text: string, note?: string) => void
  handleCopy: () => void
  onDeleteHighlight?: (id: string) => void
}

export interface SelectionNoteEditorProps {
  note: string
  setNote: React.Dispatch<React.SetStateAction<string>>
  isDark: boolean
  pillBtnClass: string
  onClose: () => void
  onSave: () => void
}
