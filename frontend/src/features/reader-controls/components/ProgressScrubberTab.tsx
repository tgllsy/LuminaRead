import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProgressScrubberTabProps } from '../types'
import { prefetchChapter } from '../../../utils/bookCache'

export const ProgressScrubberTab: React.FC<ProgressScrubberTabProps> = ({
  chapterIndex,
  totalChapters,
  chapterTitle,
  progressPercent,
  isDark,
  onSelectChapter,
  getChapterTitle,
  bookId,
}) => {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setScrubIndex(null)
    setIsScrubbing(false)
  }, [chapterIndex])

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    }
  }, [])

  const maxChapterIdx = Math.max(0, totalChapters - 1)
  const activeIdx = Math.max(0, Math.min(scrubIndex ?? chapterIndex, maxChapterIdx))
  const displayPercent =
    totalChapters > 0
      ? Math.round(((activeIdx + 1) / totalChapters) * 100)
      : progressPercent

  const activeTitle = getChapterTitle
    ? getChapterTitle(activeIdx)
    : activeIdx === chapterIndex
    ? chapterTitle
    : `第 ${activeIdx + 1} 章`

  // 1. Sliding/dragging: local instant update, 0 lag, debounced background prefetch
  const handleSliderInput = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxChapterIdx))
    setScrubIndex(clamped)
    setIsScrubbing(true)

    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    prefetchTimerRef.current = setTimeout(() => {
      if (bookId) prefetchChapter(bookId, clamped)
    }, 120)
  }

  // 2. Release/commit: jump to target chapter
  const handleCommit = (targetVal?: number) => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    const finalIdx = targetVal !== undefined ? Math.max(0, Math.min(targetVal, maxChapterIdx)) : activeIdx
    setIsScrubbing(false)
    setScrubIndex(null)
    if (finalIdx !== chapterIndex) {
      onSelectChapter?.(finalIdx)
    }
  }

  return (
    <div className="space-y-4 pb-3">
      <div className="text-center space-y-1 px-2">
        <div className="text-xs font-semibold truncate flex items-center justify-center gap-1.5">
          {isScrubbing && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1b88ee] animate-pulse" />
          )}
          <span>{activeTitle}</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          第 {activeIdx + 1} / {Math.max(1, totalChapters)} 章 · 已读 {displayPercent}%
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={activeIdx <= 0}
          onClick={() => handleCommit(Math.max(0, activeIdx - 1))}
          className={`px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-1 disabled:opacity-35 transition-colors shrink-0 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              : 'bg-[#f2f3f5] hover:bg-slate-200/80 text-slate-700'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>上一章</span>
        </button>

        <div
          className={`flex-1 h-11 rounded-full px-4 flex items-center relative ${
            isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
          }`}
        >
          <input
            type="range"
            min={0}
            max={maxChapterIdx}
            value={activeIdx}
            onInput={(e) => handleSliderInput(Number(e.currentTarget.value))}
            onChange={(e) => handleSliderInput(Number(e.currentTarget.value))}
            onPointerDown={() => setIsScrubbing(true)}
            onPointerUp={(e) => handleCommit(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommit(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
                handleCommit(Number((e.target as HTMLInputElement).value))
              }
            }}
            className="w-full accent-[#1b88ee] h-1.5 cursor-pointer touch-none"
          />
        </div>

        <button
          type="button"
          disabled={activeIdx >= maxChapterIdx}
          onClick={() => handleCommit(Math.min(maxChapterIdx, activeIdx + 1))}
          className={`px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-1 disabled:opacity-35 transition-colors shrink-0 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              : 'bg-[#f2f3f5] hover:bg-slate-200/80 text-slate-700'
          }`}
        >
          <span>下一章</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
