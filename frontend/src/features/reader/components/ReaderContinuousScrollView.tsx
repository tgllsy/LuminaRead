import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReaderTypography, BookChapter } from '../types'
import { FONT_FAMILY_MAP, FONT_CLASS_MAP } from '../constants'

interface ReaderContinuousScrollViewProps {
  typography: ReaderTypography
  chapters: BookChapter[]
  chapterIndex: number
  currentChapter: BookChapter
  connectedChapterIndices: number[]
  paragraphs: string[]
  isContinuousSingleScroll: boolean
  progressPercent: number
  readingEstimateText?: string
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>
  chapterStreamRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  onSelectChapter: (nextIdx: number) => void
  onAppendNextContinuousChapter: () => void
  renderParagraph: (pIdx: number, chIdx: number, paras: string[]) => React.ReactNode
}

export const ReaderContinuousScrollView: React.FC<ReaderContinuousScrollViewProps> = ({
  typography,
  chapters,
  chapterIndex,
  currentChapter,
  connectedChapterIndices,
  paragraphs,
  isContinuousSingleScroll,
  progressPercent,
  readingEstimateText,
  bottomSentinelRef,
  chapterStreamRefs,
  onSelectChapter,
  onAppendNextContinuousChapter,
  renderParagraph,
}) => {
  const fontClass = FONT_CLASS_MAP[typography.fontFamily] || 'reader-font-serif'
  const streamIndices = isContinuousSingleScroll ? connectedChapterIndices : [chapterIndex]
  const lastStreamChIdx = streamIndices[streamIndices.length - 1] ?? chapterIndex
  const firstStreamChIdx = streamIndices[0] ?? chapterIndex

  return (
    <>
      <div
        style={{
          fontSize: `${typography.fontSize}px`,
          lineHeight: typography.lineHeight,
          fontFamily: FONT_FAMILY_MAP[typography.fontFamily],
        }}
        className={fontClass}
      >
        {streamIndices.map((streamChIdx, idxInStream) => {
          const streamChObj = chapters[streamChIdx] || currentChapter
          const streamParas =
            streamChIdx === chapterIndex
              ? paragraphs
              : String(streamChObj.content || '')
                  .split(/\n{2,}|\n/)
                  .map((p) => p.trim())
                  .filter(Boolean)

          return (
            <div
              key={`ch-stream-${streamChIdx}`}
              data-chapter-stream-index={streamChIdx}
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: 'auto 1200px',
              }}
              ref={(el) => {
                chapterStreamRefs.current[streamChIdx] = el
              }}
            >
              {idxInStream > 0 && (() => {
                const p0 = (streamParas[0] || '').trim()
                const nTitle = (streamChObj.title || '').replace(/^#{1,6}\s*/, '').replace(/\s+/g, '')
                const nP0 = p0.replace(/^#{1,6}\s*/, '').replace(/\s+/g, '')
                const hasInlineH = p0.startsWith('#') && nTitle.length > 0 && (nP0 === nTitle || nP0.includes(nTitle) || nTitle.includes(nP0))
                return (
                  <div className="mt-12 mb-5 pt-8 border-t border-current/10 space-y-2 select-none">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[11px] font-sans font-semibold">
                      <span>
                        章节连读 · 第 {streamChIdx + 1} / {chapters.length} 章
                      </span>
                    </div>
                    {!hasInlineH && (
                      <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
                        {streamChObj.title}
                      </h2>
                    )}
                  </div>
                )
              })()}

              {streamParas.length > 0 ? (
                streamParas.map((_, pIdx) => renderParagraph(pIdx, streamChIdx, streamParas))
              ) : (
                <div className="py-8 text-center text-xs font-sans opacity-55">
                  正在连接章节《{streamChObj.title}》...
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div ref={bottomSentinelRef} className="h-4 w-full" />

      {/* Footer Navigation */}
      <div
        data-no-hud-toggle="true"
        className="mt-8 pt-6 pb-8 sm:pb-2 border-t border-current/10 flex flex-wrap items-center justify-between gap-4 select-none"
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectChapter(Math.max(0, firstStreamChIdx - 1))
          }}
          disabled={firstStreamChIdx <= 0}
          className="px-4 py-2.5 rounded-full border border-current/15 disabled:opacity-35 hover:bg-current/5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          上一章
        </button>

        <div className="text-xs font-sans opacity-80 text-center space-y-1">
          {readingEstimateText && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b88ee]/12 text-[#1b88ee] font-semibold text-xs shadow-2xs mb-0.5">
              <span>⏱️ {readingEstimateText}</span>
            </div>
          )}
          <div>
            全书进度 {progressPercent}% · 第 {chapterIndex + 1} / {chapters.length} 章
          </div>
          {isContinuousSingleScroll && lastStreamChIdx < chapters.length - 1 && (
            <div className="text-[11px] text-[#1b88ee] font-medium">
              已开启章节连读 · 下滑到底自动连接《
              {chapters[lastStreamChIdx + 1]?.title || `第 ${lastStreamChIdx + 2} 章`}
              》
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (isContinuousSingleScroll && lastStreamChIdx < chapters.length - 1) {
              onAppendNextContinuousChapter()
            } else {
              onSelectChapter(lastStreamChIdx + 1)
            }
          }}
          disabled={lastStreamChIdx >= chapters.length - 1}
          className="px-5 py-2.5 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] disabled:opacity-35 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>
            {isContinuousSingleScroll && lastStreamChIdx < chapters.length - 1
              ? '连读下一章'
              : '下一章'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}
