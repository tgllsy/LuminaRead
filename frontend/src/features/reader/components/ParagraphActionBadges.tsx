import React from 'react'
import { Headphones, MessageSquareQuote } from 'lucide-react'
import type { HighlightItem } from '../types'

interface ParagraphActionBadgesProps {
  isFinalSlice: boolean
  isRefDivider: boolean
  isTtsActive: boolean
  isParaFocused: boolean
  isListeningMode: boolean
  targetChIdx: number
  pIdx: number
  canSpeak?: boolean
  primaryHl?: HighlightItem
  notesWithContent: HighlightItem[]
  paraHighlightsCount: number
  onStartTtsAtParagraph: (chIdx: number, pIdx: number) => void
  onSelectHighlightForNote: (
    hl: HighlightItem,
    pIdx: number,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

export const ParagraphActionBadges: React.FC<ParagraphActionBadgesProps> = ({
  isFinalSlice,
  isRefDivider,
  isTtsActive,
  isParaFocused,
  isListeningMode,
  targetChIdx,
  pIdx,
  canSpeak = true,
  primaryHl,
  notesWithContent,
  paraHighlightsCount,
  onStartTtsAtParagraph,
  onSelectHighlightForNote,
}) => {
  if (!isFinalSlice) return null

  return (
    <>
      {canSpeak && !isRefDivider && isTtsActive && (
        <span
          data-no-hud-toggle="true"
          className="reader-ui-badge indent-0 tracking-normal select-none inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 text-[11px] font-sans font-semibold align-middle"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          <span>正在朗读</span>
        </span>
      )}

      {canSpeak && !isRefDivider && !isTtsActive && (
        <button
          type="button"
          data-no-hud-toggle="true"
          onClick={(e) => {
            e.stopPropagation()
            onStartTtsAtParagraph(targetChIdx, pIdx)
          }}
          title="从此段开始听书播放"
          className="reader-ui-badge indent-0 tracking-normal select-none items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white text-[11px] font-sans font-semibold align-middle transition-all cursor-pointer hidden group-hover/para:inline-flex group-focus-within/para:inline-flex opacity-0 group-hover/para:opacity-100 group-focus-within/para:opacity-100"
        >
          <Headphones className="w-3 h-3" />
          <span>从此段听</span>
        </button>
      )}

      {primaryHl && (
        <button
          type="button"
          data-no-hud-toggle="true"
          onClick={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            onSelectHighlightForNote(notesWithContent[0] || primaryHl, pIdx, {
              top: r.top,
              left: r.left,
              bottom: r.bottom,
              width: r.width,
            })
          }}
          className="reader-ui-badge indent-0 tracking-normal inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold align-middle hover:bg-amber-500/30 transition-all cursor-pointer"
        >
          <MessageSquareQuote className="w-3 h-3" />
          <span>
            {notesWithContent.length > 0
              ? `想法 · ${notesWithContent.length}`
              : `已划线 · ${paraHighlightsCount}`}
          </span>
        </button>
      )}
    </>
  )
}
