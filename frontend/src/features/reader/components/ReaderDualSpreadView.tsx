import React, { useState, useRef, useEffect } from 'react'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageSpread, ReaderTypography, BookSummary, BookChapter, PageSliceItem } from '../types'
import { FONT_FAMILY_MAP, FONT_CLASS_MAP } from '../constants'
import { DualSpreadTurnLeaf } from './DualSpreadTurnLeaf'

interface ReaderDualSpreadViewProps {
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

export const ReaderDualSpreadView: React.FC<ReaderDualSpreadViewProps> = ({
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

  const [turningState, setTurningState] = useState<{
    direction: 'prev' | 'next'
    turningSpread: PageSpread
    targetSpread: PageSpread
  } | null>(null)
  const [slideDir, setSlideDir] = useState<'prev' | 'next' | null>(null)
  const prevSpreadRef = useRef(clampedSpreadIndex)

  const animType = typography.eInkMode ? 'instant' : (typography.pageTurnAnimation || 'curl')

  useEffect(() => {
    if (clampedSpreadIndex !== prevSpreadRef.current) {
      const dir = clampedSpreadIndex > prevSpreadRef.current ? 'next' : 'prev'
      const oldSpread = paginatedSpreads[prevSpreadRef.current]
      const newSpread = paginatedSpreads[clampedSpreadIndex]
      prevSpreadRef.current = clampedSpreadIndex

      if (animType === 'curl' && oldSpread && newSpread) {
        setTurningState({ direction: dir, turningSpread: oldSpread, targetSpread: newSpread })
        const timer = setTimeout(() => setTurningState(null), 360)
        return () => clearTimeout(timer)
      } else if (animType === 'slide') {
        setSlideDir(dir)
        const timer = setTimeout(() => setSlideDir(null), 300)
        return () => clearTimeout(timer)
      }
    }
  }, [clampedSpreadIndex, animType, paginatedSpreads])

  // When turning 3D leaf, background columns show the stationary underlying pages
  const baseLeftSpread = turningState
    ? (turningState.direction === 'next' ? turningState.turningSpread : turningState.targetSpread)
    : currentSpread
  const baseRightSpread = turningState
    ? (turningState.direction === 'next' ? turningState.targetSpread : turningState.turningSpread)
    : currentSpread

  const containerSlideClass = slideDir ? (slideDir === 'next' ? 'page-turn-slide-next' : 'page-turn-slide-prev') : ''

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden relative">
      <div
        key={turningState ? 'spread-turning' : `spread-${clampedSpreadIndex}`}
        style={{
          fontSize: `${typography.fontSize}px`,
          lineHeight: typography.lineHeight,
          fontFamily: FONT_FAMILY_MAP[typography.fontFamily],
        }}
        className={`${fontClass} ${containerSlideClass} flex-1 min-h-0 grid grid-cols-2 gap-8 xl:gap-12 items-stretch overflow-hidden relative`}
      >
        {/* Left Page Column */}
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden pr-1">
          <div className="mb-2 flex items-center justify-between text-[11px] font-sans opacity-40 select-none shrink-0">
            <span className="truncate max-w-[260px]">{book.title}</span>
            {book.format === 'pdf' && (
              <button
                type="button"
                data-no-hud-toggle="true"
                onClick={(e) => {
                  e.stopPropagation()
                  onSwitchPdfMode('page_canvas')
                }}
                className="px-2 py-0.5 rounded bg-current/10 hover:bg-current/20 text-[10px]"
              >
                原版书页
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden pb-1">
            {clampedSpreadIndex === 0 && !turningState && (
              <h1 className="text-lg xl:text-xl font-bold tracking-tight mb-3 pb-2 border-b border-current/10">
                {currentChapter.title}
              </h1>
            )}
            {baseLeftSpread?.left.map((sliceItem) => renderParagraph(sliceItem, chapterIndex))}
          </div>
        </div>

        {/* Right Page Column */}
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden pl-1">
          <div className="mb-2 flex items-center justify-between text-[11px] font-sans opacity-40 select-none shrink-0">
            <span className="truncate max-w-[260px]">{currentChapter.title}</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          {baseRightSpread && baseRightSpread.right.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-hidden pb-1">
              {baseRightSpread.right.map((sliceItem) => renderParagraph(sliceItem, chapterIndex))}
            </div>
          ) : (
            <div
              data-no-hud-toggle="true"
              className="flex-1 min-h-0 rounded-2xl border border-dashed border-current/12 bg-current/[0.015] p-6 flex flex-col items-center justify-center text-center gap-3 select-none"
            >
              <div className="w-10 h-10 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold opacity-85">本章已读完</div>
                <div className="text-xs opacity-55 font-sans">
                  {chapterIndex < chapters.length - 1
                    ? `下一章：${chapters[chapterIndex + 1]?.title || `第 ${chapterIndex + 2} 章`}`
                    : '已读至全书最后一章'}
                </div>
              </div>
              {chapterIndex < chapters.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectChapter(chapterIndex + 1)
                  }}
                  className="mt-1 px-4 py-2 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>进入下一章</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3D Realistic Page-Turn Leaf Overlay */}
        {turningState && (
          <DualSpreadTurnLeaf
            direction={turningState.direction}
            turningSpread={turningState.turningSpread}
            targetSpread={turningState.targetSpread}
            chapterIndex={chapterIndex}
            typography={typography}
            fontClass={fontClass}
            book={book}
            currentChapter={currentChapter}
            progressPercent={progressPercent}
            renderParagraph={renderParagraph}
          />
        )}
      </div>

      {/* Dual-Column Page Footers */}
      <div
        data-no-hud-toggle="true"
        onClick={(e) => e.stopPropagation()}
        className="mt-1.5 pt-2.5 border-t border-current/10 shrink-0 grid grid-cols-2 gap-8 xl:gap-12 items-center select-none"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPageTurnScreen('prev')}
            disabled={isFirstSpread && chapterIndex <= 0}
            className="px-3.5 py-1.5 rounded-full border border-current/15 disabled:opacity-30 hover:bg-current/5 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{isFirstSpread ? '上一章' : '上一页'}</span>
          </button>
          <div className="flex items-center gap-3">
            {readingEstimateText && (
              <span className="text-[11px] font-sans opacity-50 hidden md:inline">
                {readingEstimateText}
              </span>
            )}
            <span className="text-[11px] font-mono opacity-45">
              {currentSpread?.leftPageNum} / {currentSpread?.totalPages}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono opacity-45">
            {currentSpread && currentSpread.right.length > 0
              ? `${currentSpread.rightPageNum} / ${currentSpread.totalPages}`
              : `${currentSpread?.totalPages} / ${currentSpread?.totalPages}`}
          </span>
          <button
            type="button"
            onClick={() => onPageTurnScreen('next')}
            disabled={isLastSpread && chapterIndex >= chapters.length - 1}
            className="px-4 py-1.5 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] disabled:opacity-30 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
          >
            <span>{isLastSpread ? '下一章' : '下一页'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
