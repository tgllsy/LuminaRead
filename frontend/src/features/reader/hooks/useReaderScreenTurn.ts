import type React from 'react'
import type { BookFullContent, ReaderTypography } from '../types'

interface UseReaderScreenTurnOptions {
  contentData: BookFullContent | null
  chapterIndex: number
  typography: ReaderTypography
  effectiveLayoutMode: 'single' | 'dual'
  pdfMode: string
  clampedSpreadIndex: number
  paginatedSpreadsLength: number
  setSpreadIndex: (idx: number) => void
  turnToLastSpreadRef: React.MutableRefObject<boolean>
  onSelectChapter: (nextIdx: number) => void
  pdfCanvasPage?: number
  totalPdfPages?: number
  pdfSpreadMode?: 'single' | 'double'
  onJumpToPdfPage?: (page: number) => void
}

export function useReaderScreenTurn({
  contentData,
  chapterIndex,
  typography,
  effectiveLayoutMode,
  pdfMode,
  clampedSpreadIndex,
  paginatedSpreadsLength,
  setSpreadIndex,
  turnToLastSpreadRef,
  onSelectChapter,
  pdfCanvasPage,
  totalPdfPages = 1,
  pdfSpreadMode = 'single',
  onJumpToPdfPage,
}: UseReaderScreenTurnOptions) {
  const handlePageTurnScreen = (direction: 'prev' | 'next') => {
    if (contentData?.book.format === 'pdf' && pdfMode === 'page_canvas' && onJumpToPdfPage && pdfCanvasPage !== undefined) {
      const step = pdfSpreadMode === 'double' ? 2 : 1
      const maxPages = Math.max(totalPdfPages, contentData.chapters[contentData.chapters.length - 1]?.pageEnd || 1)
      if (direction === 'next') {
        const nextP = pdfCanvasPage + step
        if (nextP <= maxPages) {
          onJumpToPdfPage(nextP)
          const mCh = contentData.chapters.findIndex((c) =>
            (c.pageStart !== undefined && c.pageEnd !== undefined && nextP >= c.pageStart && nextP <= c.pageEnd) ||
            (c.pageStart !== undefined && nextP >= c.pageStart && (!c.pageEnd || nextP <= c.pageEnd))
          )
          if (mCh >= 0 && mCh !== chapterIndex) onSelectChapter(mCh)
        } else if (chapterIndex < contentData.chapters.length - 1) {
          onSelectChapter(chapterIndex + 1)
        }
      } else {
        const prevP = pdfCanvasPage - step
        if (prevP >= 1) {
          onJumpToPdfPage(prevP)
          const mCh = contentData.chapters.findIndex((c) =>
            (c.pageStart !== undefined && c.pageEnd !== undefined && prevP >= c.pageStart && prevP <= c.pageEnd) ||
            (c.pageStart !== undefined && prevP >= c.pageStart && (!c.pageEnd || prevP <= c.pageEnd))
          )
          if (mCh >= 0 && mCh !== chapterIndex) onSelectChapter(mCh)
        } else if (chapterIndex > 0) {
          onSelectChapter(chapterIndex - 1)
        }
      }
      return
    }

    const isPagedMode =
      (effectiveLayoutMode === 'dual' || typography.continuousScroll === false) &&
      !(contentData?.book.format === 'pdf' && pdfMode === 'page_canvas')

    if (isPagedMode) {
      if (direction === 'next') {
        if (clampedSpreadIndex < paginatedSpreadsLength - 1) setSpreadIndex(clampedSpreadIndex + 1)
        else if (contentData && chapterIndex < contentData.chapters.length - 1) onSelectChapter(chapterIndex + 1)
      } else {
        if (clampedSpreadIndex > 0) setSpreadIndex(clampedSpreadIndex - 1)
        else if (chapterIndex > 0) {
          turnToLastSpreadRef.current = true
          onSelectChapter(chapterIndex - 1)
        }
      }
      return
    }

    const step = Math.round(window.innerHeight * 0.85)
    const behavior = typography.theme === 'eink' || typography.eInkMode ? 'auto' : 'smooth'
    if (direction === 'next') {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48
      if (atBottom && contentData && chapterIndex < contentData.chapters.length - 1) onSelectChapter(chapterIndex + 1)
      else window.scrollBy({ top: step, behavior })
    } else {
      if (window.scrollY <= 32 && chapterIndex > 0) onSelectChapter(chapterIndex - 1)
      else window.scrollBy({ top: -step, behavior })
    }
  }

  return { handlePageTurnScreen }
}
