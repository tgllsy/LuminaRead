import React from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import type { PageSpread, ReaderTypography, BookSummary, BookChapter, PageSliceItem } from '../types'
import { FONT_FAMILY_MAP, FONT_CLASS_MAP, THEME_STYLES } from '../constants'
import { usePageTurnAnimation } from '../hooks/usePageTurnAnimation'

export interface ReaderSinglePagedViewProps {
  typography: ReaderTypography
  book: BookSummary
  chapters: BookChapter[]
  chapterIndex: number
  currentChapter: BookChapter
  paginatedSpreads: PageSpread[]
  clampedSpreadIndex: number
  progressPercent: number
  readingEstimateText?: string
  onPageTurnScreen: (direction: 'prev' | 'next') => void
  onSelectChapter: (nextIdx: number) => void
  onSwitchPdfMode: (mode: 'hybrid' | 'page_canvas' | 'text_only') => void
  renderParagraph: (item: number | PageSliceItem, targetChIdx: number) => React.ReactNode
}

export const ReaderSinglePagedView: React.FC<ReaderSinglePagedViewProps> = ({
  typography,
  book,
  chapters,
  chapterIndex,
  currentChapter,
  paginatedSpreads,
  clampedSpreadIndex,
  progressPercent,
  readingEstimateText,
  onPageTurnScreen,
  onSelectChapter,
  onSwitchPdfMode,
  renderParagraph,
}) => {
  const fontClass = FONT_CLASS_MAP[typography.fontFamily] || 'reader-font-serif'
  const currentSpread = paginatedSpreads[clampedSpreadIndex] || paginatedSpreads[0]
  const isFirstSpread = clampedSpreadIndex <= 0
  const isLastSpread = clampedSpreadIndex >= paginatedSpreads.length - 1
  const animType = typography.eInkMode ? 'instant' : (typography.pageTurnAnimation || 'curl')
  const themePageClass = THEME_STYLES[typography.theme]?.page || 'bg-white text-slate-900'

  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    animClass,
    dragStyle,
    turningSingleState,
  } = usePageTurnAnimation({
    clampedSpreadIndex,
    isFirstPage: isFirstSpread,
    isLastPage: isLastSpread,
    animType,
    onPageTurnScreen,
  })

  const turningSpread = turningSingleState
    ? paginatedSpreads[turningSingleState.fromSpreadIndex]
    : null

  const fontStyle: React.CSSProperties = {
    fontSize: `${typography.fontSize}px`,
    lineHeight: typography.lineHeight,
    fontFamily: FONT_FAMILY_MAP[typography.fontFamily],
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden relative select-text w-full">
      {/* 顶部微型页眉 */}
      <div className="mb-2 px-1 flex items-center justify-between text-[11px] font-sans opacity-45 select-none shrink-0 border-b border-current/5 pb-1">
        <span className="truncate max-w-[200px] sm:max-w-[320px] font-medium">{currentChapter.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {readingEstimateText && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] bg-current/5 text-current/80">
              {readingEstimateText}
            </span>
          )}
          <span className="font-mono">{progressPercent}%</span>
          {book.format === 'pdf' && (
            <button
              type="button"
              data-no-hud-toggle="true"
              onClick={(e) => {
                e.stopPropagation()
                onSwitchPdfMode('page_canvas')
              }}
              className="px-1.5 py-0.5 rounded bg-current/10 hover:bg-current/20 text-[10px]"
            >
              原版
            </button>
          )}
        </div>
      </div>

      {/* 核心单页阅读区域（多层立体翻折与手势拖拽） */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Underneath layer for 'prev' turn */}
        {turningSingleState?.direction === 'prev' && turningSpread && (
          <div
            style={fontStyle}
            className={`${fontClass} ${themePageClass} absolute inset-0 flex flex-col justify-start overflow-hidden px-1 pointer-events-none opacity-90`}
          >
            <div className="flex-1 min-h-0 overflow-hidden pb-1">
              {turningSpread.left.map((sliceItem) => renderParagraph(sliceItem, chapterIndex))}
            </div>
          </div>
        )}

        {/* Main active page layer */}
        <div
          key={`page-${clampedSpreadIndex}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ ...fontStyle, ...dragStyle }}
          className={`${fontClass} ${themePageClass} ${
            turningSingleState?.direction === 'prev' ? 'page-turn-single-curl-in' : animClass
          } absolute inset-0 flex flex-col justify-start overflow-hidden px-1`}
        >
          {clampedSpreadIndex === 0 && !turningSingleState && (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 pb-2 border-b border-current/10">
              {currentChapter.title}
            </h1>
          )}

          <div className="flex-1 min-h-0 overflow-hidden pb-1">
            {currentSpread?.left.map((sliceItem) => renderParagraph(sliceItem, chapterIndex))}
          </div>

          {/* 本章末页提示卡片 */}
          {isLastSpread && chapterIndex < chapters.length - 1 && (
            <div
              data-no-hud-toggle="true"
              onClick={(e) => {
                e.stopPropagation()
                onSelectChapter(chapterIndex + 1)
              }}
              className="mt-4 p-3 rounded-2xl border border-dashed border-current/15 bg-current/[0.02] hover:bg-current/[0.05] transition-colors flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1b88ee]" />
                <div className="text-xs">
                  <span className="opacity-60">下一章：</span>
                  <span className="font-semibold">{chapters[chapterIndex + 1]?.title}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>
          )}
        </div>

        {/* Outgoing layer for 'next' turn */}
        {turningSingleState?.direction === 'next' && turningSpread && (
          <div
            style={fontStyle}
            className={`${fontClass} ${themePageClass} page-turn-single-curl-out absolute inset-0 flex flex-col justify-start overflow-hidden px-1 pointer-events-none z-20`}
          >
            <div className="flex-1 min-h-0 overflow-hidden pb-1">
              {turningSpread.left.map((sliceItem) => renderParagraph(sliceItem, chapterIndex))}
            </div>
          </div>
        )}
      </div>

      {/* 底部微型页脚 */}
      <div className="mt-2 px-1 flex items-center justify-between text-[11px] font-sans opacity-45 select-none shrink-0 border-t border-current/5 pt-1">
        <span className="truncate max-w-[220px] sm:max-w-[340px]">{book.title}</span>
        <span className="font-mono">
          {currentSpread?.leftPageNum || 1} / {currentSpread?.totalPages || 1}
        </span>
      </div>
    </div>
  )
}
