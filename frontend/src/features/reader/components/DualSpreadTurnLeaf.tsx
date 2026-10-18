import React from 'react'
import type { PageSpread, ReaderTypography, BookSummary, BookChapter, PageSliceItem } from '../types'
import { FONT_FAMILY_MAP, THEME_STYLES } from '../constants'

export interface DualSpreadTurnLeafProps {
  direction: 'prev' | 'next'
  turningSpread: PageSpread
  targetSpread: PageSpread
  chapterIndex: number
  typography: ReaderTypography
  fontClass: string
  book: BookSummary
  currentChapter: BookChapter
  progressPercent: number
  renderParagraph: (item: number | PageSliceItem, targetChIdx: number) => React.ReactNode
  customAngle?: number | null
}

export const DualSpreadTurnLeaf: React.FC<DualSpreadTurnLeafProps> = ({
  direction,
  turningSpread,
  targetSpread,
  chapterIndex,
  typography,
  fontClass,
  book,
  currentChapter,
  progressPercent,
  renderParagraph,
  customAngle = null,
}) => {
  const isNext = direction === 'next'
  const isInteractive = typeof customAngle === 'number'
  const leafAnimClass = isInteractive
    ? ''
    : isNext
    ? 'dual-leaf-turn-next'
    : 'dual-leaf-turn-prev'

  const leafPositionClass = isNext
    ? 'left-1/2 right-0 w-1/2'
    : 'left-0 right-1/2 w-1/2'

  const interactiveStyle: React.CSSProperties = isInteractive
    ? {
        transform: `perspective(2400px) rotateY(${customAngle}deg)`,
        transformOrigin: isNext ? '0% 50%' : '100% 50%',
        willChange: 'transform, box-shadow',
        transformStyle: 'preserve-3d',
        transition: 'none',
        boxShadow:
          isNext
            ? `-${Math.min(32, Math.abs(customAngle) * 0.18)}px 12px 34px rgba(0,0,0,${Math.min(0.32, Math.abs(customAngle) / 400)})`
            : `${Math.min(32, Math.abs(customAngle) * 0.18)}px 12px 34px rgba(0,0,0,${Math.min(0.32, Math.abs(customAngle) / 400)})`,
      }
    : {}

  const themePageClass = THEME_STYLES[typography.theme]?.page || 'bg-white text-slate-900'

  const fontStyle: React.CSSProperties = {
    fontSize: `${typography.fontSize}px`,
    lineHeight: typography.lineHeight,
    fontFamily: FONT_FAMILY_MAP[typography.fontFamily],
  }

  // Next: Front is turningSpread.right, Back is targetSpread.left
  // Prev: Front is turningSpread.left, Back is targetSpread.right
  const frontSlices = isNext ? turningSpread.right : turningSpread.left
  const backSlices = isNext ? targetSpread.left : targetSpread.right
  const frontTitle = isNext ? currentChapter.title : book.title
  const backTitle = isNext ? book.title : currentChapter.title
  const frontIsFirstPage = !isNext && turningSpread.leftPageNum === 1
  const backIsFirstPage = isNext && targetSpread.leftPageNum === 1

  return (
    <div
      aria-hidden="true"
      style={interactiveStyle}
      className={`absolute top-0 bottom-0 ${leafPositionClass} ${leafAnimClass} z-30 pointer-events-none select-none`}
    >
      {/* 1. FRONT FACE (Visible initially from 0deg to ~90deg) */}
      <div
        style={fontStyle}
        className={`absolute inset-0 backface-hidden flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl ${themePageClass} ${fontClass} ${
          isNext ? 'pl-4 pr-1' : 'pr-4 pl-1'
        }`}
      >
        <div className="mb-2 flex items-center justify-between text-[11px] font-sans opacity-40 shrink-0">
          <span className="truncate max-w-[240px]">{frontTitle}</span>
          {isNext && <span className="font-mono">{progressPercent}%</span>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] pb-2 sm:pb-3">
          {frontIsFirstPage && (
            <h1 className="text-lg xl:text-xl font-bold tracking-tight mb-3 pb-2 border-b border-current/10">
              {currentChapter.title}
            </h1>
          )}
          {frontSlices.map((item) => renderParagraph(item, chapterIndex))}
        </div>
        <div
          className={`absolute inset-y-0 ${
            isNext ? 'left-0 w-8 bg-gradient-to-r' : 'right-0 w-8 bg-gradient-to-l'
          } from-black/15 to-transparent pointer-events-none`}
        />
      </div>

      {/* 2. BACK FACE (Visible from ~90deg to 180deg) */}
      <div
        style={{
          ...fontStyle,
          transform: isNext ? 'rotateY(180deg)' : 'rotateY(-180deg)',
        }}
        className={`absolute inset-0 backface-hidden flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl ${themePageClass} ${fontClass} ${
          isNext ? 'pr-4 pl-1' : 'pl-4 pr-1'
        }`}
      >
        <div className="mb-2 flex items-center justify-between text-[11px] font-sans opacity-40 shrink-0">
          <span className="truncate max-w-[240px]">{backTitle}</span>
          {!isNext && <span className="font-mono">{progressPercent}%</span>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] pb-2 sm:pb-3">
          {backIsFirstPage && (
            <h1 className="text-lg xl:text-xl font-bold tracking-tight mb-3 pb-2 border-b border-current/10">
              {currentChapter.title}
            </h1>
          )}
          {backSlices.map((item) => renderParagraph(item, chapterIndex))}
        </div>
        <div
          className={`absolute inset-y-0 ${
            isNext ? 'right-0 w-8 bg-gradient-to-l' : 'left-0 w-8 bg-gradient-to-r'
          } from-black/15 to-transparent pointer-events-none`}
        />
      </div>
    </div>
  )
}
