import React from 'react'
import type {
  ParagraphSemanticStyle,
  ReaderTypography,
  HighlightItem,
  BookSummary,
} from '../types'
import {
  parseFootnoteDefinition,
  isRefDividerParagraph,
  classifyParagraphTypography,
  getParagraphClassName,
  filterHighlightsForParagraph,
} from '../helpers'
import { SceneDividerFigure } from './SceneDividerFigure'
import { CodeBlockFigure } from './CodeBlockFigure'
import { ParagraphHighlightedSpans } from './ParagraphHighlightedSpans'
import { ParagraphActionBadges } from './ParagraphActionBadges'
import { ParagraphNoteCallouts } from './ParagraphNoteCallouts'
import { isNonSpokenMarkerParagraph } from '../../audio-tts'
import { useTtsStore } from '../../../stores/ttsStore'

export interface ParagraphTextContentProps {
  itemKey: string
  targetChIdx: number
  pIdx: number
  sliceStart?: number
  sliceEnd?: number
  isContinuation: boolean
  para: string
  targetParas: string[]
  targetChHighlights: HighlightItem[]
  typography: ReaderTypography
  book: BookSummary
  chapterIndex: number
  referenceDividerIdx: number
  isCurrentChapterReference: boolean
  highlightKeyword: string
  isListeningMode: boolean
  ttsActivePara: number | null
  flashedParaIndex: number | null
  focusedPara: { chapterIndex: number; paragraphIndex: number } | null
  bilingualMap: Record<number, string>
  touchStartRef: React.MutableRefObject<{ x: number; y: number; time: number } | null>
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  onOpenCitationMarker: (rawMarker: string, sourceParaIdx: number, sourceChapterIdx?: number) => void
  onJumpBackFromFootnoteDef: (key: string) => void
  onStartTtsAtParagraph: (chIdx: number, pIdx: number) => void
  onSelectHighlightForNote: (
    hl: HighlightItem,
    pIdx: number,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
  onTextMouseUp: (pIdx: number, chIdx: number) => void
  onOpenEntityWiki?: (
    term: string,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

export const ParagraphTextContent: React.FC<ParagraphTextContentProps> = ({
  itemKey, targetChIdx, pIdx, sliceStart, sliceEnd, isContinuation,
  para, targetParas, targetChHighlights, typography, book, chapterIndex,
  referenceDividerIdx, isCurrentChapterReference, highlightKeyword,
  isListeningMode, ttsActivePara, flashedParaIndex, focusedPara,
  bilingualMap, touchStartRef, paragraphRefs, onOpenCitationMarker,
  onJumpBackFromFootnoteDef, onStartTtsAtParagraph, onSelectHighlightForNote,
  onTextMouseUp, onOpenEntityWiki,
}) => {
  // Unconditional hook calls at top of component (Rules of Hooks compliant)
  const isTtsActive = useTtsStore((s) => {
    const a = s.audioStatus
    const isSpeakingEngaged = Boolean(
      a.active &&
      (a.playing || a.loading || a.paused) &&
      (!a.bookId || a.bookId === book.id)
    )
    const currentSpeakingChapter = a.chapterIndex ?? focusedPara?.chapterIndex ?? chapterIndex
    const currentSpeakingPara = a.paragraphIndex ?? ttsActivePara
    return Boolean(
      isSpeakingEngaged &&
      targetChIdx === currentSpeakingChapter &&
      currentSpeakingPara === pIdx
    )
  })
  const activeSentence = useTtsStore((s) => (isTtsActive ? s.activeSentence : ''))

  const fnDef = parseFootnoteDefinition(para)
  const isRefDivider = isRefDividerParagraph(para)
  const isAfterRefDivider =
    targetChIdx === chapterIndex && referenceDividerIdx >= 0 && pIdx > referenceDividerIdx
  const isSmallPrintRef = Boolean(fnDef) || isCurrentChapterReference || isAfterRefDivider

  const semanticInfo = !fnDef && !isRefDivider && !isSmallPrintRef
    ? classifyParagraphTypography(para, targetParas[pIdx + 1])
    : { style: 'normal' as ParagraphSemanticStyle, cleanText: para }

  if (semanticInfo.style === 'divider') {
    return <SceneDividerFigure itemKey={itemKey} pIdx={pIdx} targetChIdx={targetChIdx} />
  }

  if (semanticInfo.style === 'code_block') {
    return (
      <CodeBlockFigure
        codeText={semanticInfo.cleanText}
        itemKey={itemKey}
        pIdx={pIdx}
        targetChIdx={targetChIdx}
      />
    )
  }

  const rawText = fnDef ? fnDef.body : semanticInfo.cleanText || para
  const isExplicitDropCap = rawText.startsWith('[[DROPCAP]]')
  const fullDisplayPara = isExplicitDropCap ? rawText.slice(11).trimStart() : rawText

  const isSliced = sliceStart !== undefined || sliceEnd !== undefined
  const isFinalSlice = !isSliced || (sliceEnd ?? fullDisplayPara.length) >= fullDisplayPara.length
  const displayPara = isSliced
    ? fullDisplayPara.slice(sliceStart ?? 0, sliceEnd ?? fullDisplayPara.length)
    : fullDisplayPara

  const paraHighlights = filterHighlightsForParagraph(targetChHighlights, pIdx, para, targetParas)
  const primaryHl = paraHighlights[0]
  const notesWithContent = paraHighlights.filter((h) => h.note && h.note.trim().length > 0)
  const isSearchFlashed = targetChIdx === chapterIndex && flashedParaIndex === pIdx
  const isParaFocused = isListeningMode && focusedPara?.chapterIndex === targetChIdx && focusedPara?.paragraphIndex === pIdx

  const isFirstBodyPara = pIdx === 0 || (pIdx === 1 && /^#/.test(targetParas[0] || ''))
  const isDropCap = (Boolean(typography.dropCap) && isFirstBodyPara && semanticInfo.style === 'normal' && !isContinuation) || isExplicitDropCap
  const shouldIndent = !isDropCap && typography.firstLineIndent !== false && !isContinuation
  const paraClass = getParagraphClassName(
    semanticInfo.style,
    isRefDivider,
    isSmallPrintRef,
    shouldIndent,
    isDropCap
  )

  return (
    <div
      key={itemKey}
      tabIndex={-1}
      data-para-index={pIdx}
      data-chapter-index={targetChIdx}
      data-slice-start={sliceStart ?? 0}
      ref={(el) => {
        if (!isContinuation && targetChIdx === chapterIndex) paragraphRefs.current[pIdx] = el
      }}
      onMouseUp={() => onTextMouseUp(pIdx, targetChIdx)}
      onTouchEnd={() => onTextMouseUp(pIdx, targetChIdx)}
      className={`group/para outline-none break-inside-avoid rounded-xl transition-colors duration-500 ${isFinalSlice ? 'mb-3' : 'mb-0'} select-text ${
        isSearchFlashed
          ? 'bg-amber-400/18 ring-2 ring-amber-400/75 px-2.5 -mx-2.5'
          : isParaFocused
          ? 'bg-emerald-500/8 ring-1 ring-emerald-500/30 px-2.5 -mx-2.5'
          : isSmallPrintRef
          ? 'pl-3.5 py-1.5 border-l-2 border-current/20 bg-current/[0.02] rounded-r-xl'
          : 'reader-para-contain'
      }`}
    >
      <p className={paraClass} style={{ lineHeight: semanticInfo.style.startsWith('heading_') ? undefined : typography.lineHeight }}>
        {fnDef && !isContinuation && (
          <button
            type="button"
            data-no-hud-toggle="true"
            onClick={(e) => {
              e.stopPropagation()
              onJumpBackFromFootnoteDef(fnDef.key)
            }}
            className="reader-ui-badge indent-0 tracking-normal inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-[0.85em] font-mono font-bold transition-colors align-baseline select-none"
          >
            <span>{fnDef.badge}</span>
            <span className="text-[0.8em] opacity-80">↩原文</span>
          </button>
        )}

        <ParagraphHighlightedSpans
          displayPara={displayPara}
          paraHighlights={paraHighlights}
          itemKey={itemKey}
          pIdx={pIdx}
          sliceStart={sliceStart}
          highlightKeyword={highlightKeyword}
          hasFnDef={Boolean(fnDef)}
          isCurrentChapterReference={isCurrentChapterReference}
          activeSentenceSnippet={activeSentence}
          isTtsActive={isTtsActive}
          touchStartRef={touchStartRef}
          onOpenCitationMarker={(rawMarker, sourceParaIdx) => onOpenCitationMarker(rawMarker, sourceParaIdx, targetChIdx)}
          onSelectHighlightForNote={onSelectHighlightForNote}
          onOpenEntityWiki={onOpenEntityWiki}
        />

        <ParagraphActionBadges
          isFinalSlice={isFinalSlice} isRefDivider={isRefDivider} canSpeak={!isNonSpokenMarkerParagraph(para)}
          isTtsActive={isTtsActive} isParaFocused={isParaFocused} isListeningMode={isListeningMode}
          targetChIdx={targetChIdx} pIdx={pIdx} primaryHl={primaryHl} notesWithContent={notesWithContent}
          paraHighlightsCount={paraHighlights.length} onStartTtsAtParagraph={onStartTtsAtParagraph}
          onSelectHighlightForNote={onSelectHighlightForNote}
        />
      </p>

      {isFinalSlice && (
        <ParagraphNoteCallouts
          notesWithContent={notesWithContent}
          pIdx={pIdx}
          bilingualText={typography.bilingualMode && targetChIdx === chapterIndex ? bilingualMap[pIdx] : undefined}
          onSelectHighlightForNote={onSelectHighlightForNote}
        />
      )}
    </div>
  )
}
