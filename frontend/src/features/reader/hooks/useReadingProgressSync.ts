import { useEffect, useCallback, useRef } from 'react'
import { readerApi } from '../api'
import { useBooksStore } from '../../../shared/stores/useBooksStore'

interface UseReadingProgressSyncOptions {
  activeBookId: string
  chapterIndex?: number
  clampedSpreadIndex?: number
  totalSpreads?: number
  getCurrentVisibleParagraphIndex?: () => number
  totalChapters?: number
  totalParagraphs?: number
  onBookStateUpdated?: () => void
  isHidden?: boolean
}

function calculateProgressPercentage(
  chapterIndex: number,
  totalChapters: number,
  paraIdx: number,
  totalParagraphs: number,
  clampedSpreadIndex?: number,
  totalSpreads?: number
): number {
  const safeTotalCh = Math.max(1, totalChapters)
  let fraction = 0

  if (typeof clampedSpreadIndex === 'number' && typeof totalSpreads === 'number' && totalSpreads > 1) {
    fraction = Math.min(1, Math.max(0, clampedSpreadIndex / (totalSpreads - 1)))
  } else if (totalParagraphs > 1) {
    fraction = Math.min(1, Math.max(0, paraIdx / (totalParagraphs - 1)))
  }

  const rawPct = ((chapterIndex + fraction) / safeTotalCh) * 100
  return Math.min(100, Math.max(0, Math.round(rawPct)))
}

export function useReadingProgressSync({
  activeBookId,
  chapterIndex = 0,
  clampedSpreadIndex,
  totalSpreads,
  getCurrentVisibleParagraphIndex,
  totalChapters = 1,
  totalParagraphs = 1,
  onBookStateUpdated,
  isHidden = false,
}: UseReadingProgressSyncOptions) {
  const onUpdatedRef = useRef(onBookStateUpdated)
  onUpdatedRef.current = onBookStateUpdated

  const lastReportedRef = useRef<{ ch: number; para: number; spread?: number }>({ ch: -1, para: -1 })
  const getParaRef = useRef(getCurrentVisibleParagraphIndex)
  getParaRef.current = getCurrentVisibleParagraphIndex

  // Heartbeat session timer
  useEffect(() => {
    if (!activeBookId || isHidden) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        readerApi.recordReadingSession(activeBookId, 30).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [activeBookId, isHidden])

  const reportProgress = useCallback(
    async (chIdx: number, scrollOffset: number, percentage: number, delta: number = 30) => {
      if (!activeBookId) return null
      try {
        lastReportedRef.current = { ch: chIdx, para: scrollOffset, spread: clampedSpreadIndex }
        const res = await readerApi.updateReadingProgress(activeBookId, {
          chapter_index: chIdx,
          scroll_offset: scrollOffset,
          percentage,
          reading_seconds_delta: delta,
        })
        if (res?.progress) {
          useBooksStore.getState().updateBookOptimistically(activeBookId, {
            progress: res.progress,
            last_read_at: res.progress.updated_at || new Date().toISOString(),
          })
          onUpdatedRef.current?.()
        }
        return res.progress
      } catch {
        return null
      }
    },
    [activeBookId, clampedSpreadIndex]
  )

  const syncCurrentProgress = useCallback(
    (force = false) => {
      if (!activeBookId) return
      const paraIdx = getParaRef.current ? getParaRef.current() : 0
      const prev = lastReportedRef.current

      const isSameLocation =
        prev.ch === chapterIndex &&
        prev.para === paraIdx &&
        (clampedSpreadIndex === undefined || prev.spread === clampedSpreadIndex)

      if (!force && isSameLocation) return

      const pct = calculateProgressPercentage(
        chapterIndex,
        totalChapters,
        paraIdx,
        totalParagraphs,
        clampedSpreadIndex,
        totalSpreads
      )
      reportProgress(chapterIndex, paraIdx, pct, 15).catch(() => {})
    },
    [activeBookId, chapterIndex, clampedSpreadIndex, totalSpreads, totalChapters, totalParagraphs, reportProgress]
  )

  // Auto-sync on page-turn / spread change
  useEffect(() => {
    if (isHidden || !activeBookId) return
    const timer = setTimeout(() => {
      syncCurrentProgress(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [clampedSpreadIndex, chapterIndex, isHidden, activeBookId, syncCurrentProgress])

  // Scroll & visibility listeners
  useEffect(() => {
    if (!activeBookId) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const onScroll = () => {
      if (isHidden) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => syncCurrentProgress(false), 1000)
    }

    const onVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') syncCurrentProgress(true)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityOrUnload)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityOrUnload)
      // Force sync on cleanup (switching tabs, closing reader)
      syncCurrentProgress(true)
    }
  }, [activeBookId, isHidden, syncCurrentProgress])

  return { reportProgress, syncCurrentProgress }
}
