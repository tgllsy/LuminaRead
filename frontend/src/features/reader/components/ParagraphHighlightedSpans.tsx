import React, { useMemo } from 'react'
import type { HighlightItem } from '../types'
import { HIGHLIGHT_CLASSES } from '../constants'
import { isTapTouch } from '../helpers'
import {
  parseRichTextRuns,
  getRunsPlainText,
  sliceRichRuns,
  wrapWithRichStyles,
  type RichTextRun,
} from '../helpers/richTextHelpers'
import { computeHighlightSpanForParagraph } from '../helpers/highlightRangeHelpers'
import { findEntitiesInText } from '../helpers/entityMatcherHelpers'
import { findSentenceRangeInText } from '../../audio-tts/helpers/sentenceIndexer'

interface ParagraphHighlightedSpansProps {
  displayPara: string
  paraHighlights: HighlightItem[]
  itemKey: string
  pIdx: number
  sliceStart?: number
  highlightKeyword: string
  hasFnDef: boolean
  isCurrentChapterReference: boolean
  activeSentenceSnippet?: string
  isTtsActive?: boolean
  touchStartRef: React.MutableRefObject<{ x: number; y: number; time: number } | null>
  onOpenCitationMarker: (rawMarker: string, sourceParaIdx: number) => void
  onSelectHighlightForNote: (
    hl: HighlightItem,
    pIdx: number,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
  onOpenEntityWiki?: (
    term: string,
    anchorRect?: import('../../reader-controls/types').SelectionAnchorRect | null
  ) => void
}

const CITATION_REGEX =
  /(〔(?:注)?\d{1,3}〕|\^?\[(?:(?:注)?\d{1,3}|[①-⑳])\]|【(?:注)?\d{1,3}】|[①-⑳⑴-⒇]|\(注\d{1,3}\)|（注\d{1,3}）|\(\d{1,3}\)|（\d{1,3}）)/g

function renderRunWithKeyword(
  text: string,
  styles: RichTextRun['styles'],
  keyPrefix: string,
  keyword?: string
): React.ReactNode {
  if (!keyword || !text.includes(keyword)) {
    return wrapWithRichStyles(text, styles, keyPrefix)
  }
  const parts = text.split(keyword)
  const nodes: React.ReactNode[] = []
  parts.forEach((p, idx) => {
    if (idx > 0) {
      nodes.push(
        <mark key={`${keyPrefix}-kw-${idx}`} className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded">
          {wrapWithRichStyles(keyword, styles, `${keyPrefix}-kwt-${idx}`)}
        </mark>
      )
    }
    if (p) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-p-${idx}`}>
          {wrapWithRichStyles(p, styles, `${keyPrefix}-pt-${idx}`)}
        </React.Fragment>
      )
    }
  })
  return <React.Fragment key={keyPrefix}>{nodes}</React.Fragment>
}

export const ParagraphHighlightedSpans: React.FC<ParagraphHighlightedSpansProps> = ({
  displayPara,
  paraHighlights,
  itemKey,
  pIdx,
  sliceStart,
  highlightKeyword,
  hasFnDef,
  isCurrentChapterReference,
  activeSentenceSnippet,
  isTtsActive,
  touchStartRef,
  onOpenCitationMarker,
  onSelectHighlightForNote,
  onOpenEntityWiki,
}) => {
  const runs = useMemo(() => parseRichTextRuns(displayPara), [displayPara])
  const plainText = useMemo(() => getRunsPlainText(runs), [runs])

  const renderSingleRun = (run: RichTextRun, keyPrefix: string): React.ReactNode => {
    if (!run.text) return null
    if (hasFnDef || isCurrentChapterReference) {
      return renderRunWithKeyword(run.text, run.styles, keyPrefix, highlightKeyword)
    }

    const parts = run.text.split(CITATION_REGEX)
    if (parts.length === 1) {
      return renderRunWithKeyword(run.text, run.styles, keyPrefix, highlightKeyword)
    }

    const subNodes = parts.map((part, idx) => {
      if (!part) return null
      if (
        /^(?:〔(?:注)?\d{1,3}〕|\^?\[(?:(?:注)?\d{1,3}|[①-⑳])\]|【(?:注)?\d{1,3}】|[①-⑳⑴-⒇]|\(注\d{1,3}\)|（注\d{1,3}）|\(\d{1,3}\)|（\d{1,3}）)$/.test(
          part
        )
      ) {
        return (
          <sup
            key={`${keyPrefix}-cit-${idx}`}
            data-no-hud-toggle="true"
            onClick={(e) => {
              e.stopPropagation()
              onOpenCitationMarker(part, pIdx)
            }}
            onTouchEnd={(e) => {
              if (!isTapTouch(touchStartRef.current, e)) return
              e.stopPropagation()
              e.preventDefault()
              onOpenCitationMarker(part, pIdx)
            }}
            title={`点击查看注释 ${part}`}
            className="reader-ui-badge indent-0 tracking-normal inline-flex items-center justify-center px-1 py-[1px] mx-0.5 -top-1 text-[0.72em] font-semibold leading-none rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors select-none"
          >
            {part.replace(/^（/, '(').replace(/）$/, ')')}
          </sup>
        )
      }
      return (
        <React.Fragment key={`${keyPrefix}-pt-${idx}`}>
          {renderRunWithKeyword(part, run.styles, `${keyPrefix}-pt-${idx}`, highlightKeyword)}
        </React.Fragment>
      )
    })

    return <React.Fragment key={keyPrefix}>{subNodes}</React.Fragment>
  }

  const renderRichRuns = (sliceList: RichTextRun[], keyPrefix: string): React.ReactNode => {
    return sliceList.map((r, i) => renderSingleRun(r, `${keyPrefix}-r-${i}`))
  }

  // 1. 计算当前段落有效划线片段 (支持单段与跨段落)
  const matchedSpans = useMemo(() => {
    return paraHighlights
      .map((hl) => computeHighlightSpanForParagraph(hl, pIdx, plainText, sliceStart))
      .filter((it): it is NonNullable<typeof it> => Boolean(it && it.start >= 0 && it.end > it.start))
      .sort((a, b) => a.start - b.start)
  }, [paraHighlights, pIdx, plainText, sliceStart])

  // 2. 识别随文实体与生僻词 (避开已有划线)
  const detectedEntities = useMemo(() => {
    if (hasFnDef || isCurrentChapterReference) return []
    const all = findEntitiesInText(plainText, 3)
    return all.filter((ent) => {
      return !matchedSpans.some((span) => Math.max(ent.start, span.start) < Math.min(ent.end, span.end))
    })
  }, [plainText, hasFnDef, isCurrentChapterReference, matchedSpans])

  const renderRunsWithEntities = (
    rangeStart: number,
    rangeEnd: number,
    keyPrefix: string
  ): React.ReactNode => {
    const entsInRange = detectedEntities.filter(
      (ent) => ent.start >= rangeStart && ent.end <= rangeEnd
    )
    if (entsInRange.length === 0) {
      const slice = sliceRichRuns(runs, rangeStart, rangeEnd)
      return renderRichRuns(slice, keyPrefix)
    }

    const fragments: React.ReactNode[] = []
    let cur = rangeStart
    entsInRange.forEach((ent, eIdx) => {
      if (ent.start > cur) {
        const pre = sliceRichRuns(runs, cur, ent.start)
        fragments.push(
          <React.Fragment key={`${keyPrefix}-pre-${eIdx}`}>
            {renderRichRuns(pre, `${keyPrefix}-pre-${eIdx}`)}
          </React.Fragment>
        )
      }
      const entSlice = sliceRichRuns(runs, ent.start, ent.end)
      fragments.push(
        <span
          key={`${keyPrefix}-ent-${ent.term}-${eIdx}`}
          data-no-hud-toggle="true"
          onClick={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            onOpenEntityWiki?.(ent.term, {
              top: r.top,
              left: r.left,
              bottom: r.bottom,
              width: r.width,
            })
          }}
          title={`轻触查看「${ent.term}」AI 百科`}
          className="border-b border-dotted border-current/40 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
        >
          {renderRichRuns(entSlice, `${keyPrefix}-ent-${eIdx}`)}
        </span>
      )
      cur = ent.end
    })
    if (cur < rangeEnd) {
      const post = sliceRichRuns(runs, cur, rangeEnd)
      fragments.push(
        <React.Fragment key={`${keyPrefix}-post`}>
          {renderRichRuns(post, `${keyPrefix}-post`)}
        </React.Fragment>
      )
    }
    return <>{fragments}</>
  }

  const ttsRange = useMemo(() => {
    if (!isTtsActive || !activeSentenceSnippet) return null
    const range = findSentenceRangeInText(plainText, activeSentenceSnippet)
    return range && range.end > range.start ? range : null
  }, [isTtsActive, activeSentenceSnippet, plainText])

  if (matchedSpans.length > 0) {
    const nodes: React.ReactNode[] = []
    let cursor = 0
    matchedSpans.forEach((span, sIdx) => {
      let effStart = span.start
      if (effStart < cursor) {
        if (span.end <= cursor) return
        effStart = cursor
      }
      if (effStart > cursor) {
        nodes.push(
          <React.Fragment key={`txt-${sIdx}`}>
            {renderRunsWithEntities(cursor, effStart, `${itemKey}-s-${sIdx}`)}
          </React.Fragment>
        )
      }
      const hlClass =
        HIGHLIGHT_CLASSES[span.hl.color]?.[span.hl.style_type] || HIGHLIGHT_CLASSES.yellow.marker
      const hasNote = Boolean(span.hl.note && span.hl.note.trim())
      const hlSlice = sliceRichRuns(runs, effStart, span.end)
      const isTtsInHighlight = Boolean(
        ttsRange && Math.max(effStart, ttsRange.start) < Math.min(span.end, ttsRange.end)
      )

      nodes.push(
        <span
          key={`hl-${span.hl.id}-${sIdx}`}
          data-no-hud-toggle="true"
          data-tts-sentence-active={isTtsInHighlight ? 'true' : undefined}
          onClick={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            onSelectHighlightForNote(span.hl, pIdx, {
              top: r.top, left: r.left, bottom: r.bottom, width: r.width,
            })
          }}
          onTouchEnd={(e) => {
            if (!isTapTouch(touchStartRef.current, e)) return
            e.stopPropagation()
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            onSelectHighlightForNote(span.hl, pIdx, {
              top: r.top, left: r.left, bottom: r.bottom, width: r.width,
            })
          }}
          className={`cursor-pointer transition-opacity active:opacity-75 ${hlClass} ${
            isTtsInHighlight ? 'reader-tts-active-sentence' : ''
          }`}
        >
          {renderRichRuns(hlSlice, `${itemKey}-hl-${sIdx}`)}
          {hasNote && (
            <sup className="reader-ui-badge indent-0 tracking-normal ml-0.5 px-1 py-0.2 rounded bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[0.65em] font-sans font-bold select-none">
              💭
            </sup>
          )}
        </span>
      )
      cursor = Math.max(cursor, span.end)
    })
    if (cursor < plainText.length) {
      nodes.push(
        <React.Fragment key="txt-end">
          {renderRunsWithEntities(cursor, plainText.length, `${itemKey}-end`)}
        </React.Fragment>
      )
    }
    return <>{nodes}</>
  }

  if (ttsRange) {
    return (
      <>
        {renderRunsWithEntities(0, ttsRange.start, `${itemKey}-tts-pre`)}
        <span className="reader-tts-active-sentence" data-tts-sentence-active="true">
          {renderRunsWithEntities(ttsRange.start, ttsRange.end, `${itemKey}-tts-active`)}
        </span>
        {renderRunsWithEntities(ttsRange.end, plainText.length, `${itemKey}-tts-post`)}
      </>
    )
  }

  return <>{renderRunsWithEntities(0, plainText.length, itemKey)}</>
}
