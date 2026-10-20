import { useEffect, useCallback, useRef } from 'react'
import { readerApi } from '../api'
import { useBooksStore } from '../../../shared/stores/useBooksStore'
import { useTtsStore } from '../../../stores/ttsStore'
import { updateBookProgressInMemoryCache } from '../../../utils/bookCache'

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

function useReadingHeartbeat(activeBookId: string, isHidden: boolean) {
  const lastActiveRef = useRef<number>(Date.now())

  useEffect(() => {
    const markActive = () => {
      lastActiveRef.current = Date.now()
    }
    window.addEventListener('pointerdown', markActive, { passive: true })
    window.addEventListener('keydown', markActive, { passive: true })
    window.addEventListener('wheel', markActive, { passive: true })
    window.addEventListener('scroll', markActive, { passive: true })
    window.addEventListener('touchstart', markActive, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
      window.removeEventListener('wheel', markActive)
      window.removeEventListener('scroll', markActive)
      window.removeEventListener('touchstart', markActive)
    }
  }, [])

  useEffect(() => {
    if (!activeBookId || isHidden) return
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const isUserActive = Date.now() - lastActiveRef.current < 90_000
      const isTtsPlaying = useTtsStore.getState().audioStatus.playing
      if (isUserActive || isTtsPlaying) {
        readerApi.recordReadingSession(activeBookId, 30).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [activeBookId, isHidden])
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

  const isHiddenRef = useRef(isHidden)
  isHiddenRef.current = isHidden

  const lastReportedRef = useRef<{ ch: number; para: number; spread?: number }>({ ch: -1, para: -1 })
  const lastValidVisibleRef = useRef<{ bookId: string; ch: number; para: number }>({
    bookId: activeBookId,
    ch: chapterIndex,
    para: 0,
  })
  const getParaRef = useRef(getCurrentVisibleParagraphIndex)
  getParaRef.current = getCurrentVisibleParagraphIndex

  useReadingHeartbeat(activeBookId, isHidden)

  const reportProgress = useCallback(
    async (chIdx: number, scrollOffset: number, percentage: number, delta: number = 0) => {
      if (!activeBookId) return null
      const nowIso = new Date().toISOString()
      const optimisticProgress = {
        book_id: activeBookId,
        chapter_index: chIdx,
        scroll_offset: scrollOffset,
        cfi: `para:${Math.max(0, Math.floor(scrollOffset))}`,
        percentage,
        device_name: 'Web-Reader',
        updated_at: nowIso,
      }
      lastReportedRef.current = { ch: chIdx, para: scrollOffset, spread: clampedSpreadIndex }
      lastValidVisibleRef.current = { bookId: activeBookId, ch: chIdx, para: scrollOffset }

      // Synchronously update global store & memory cache so immediate return-to-shelf never reads stale progress
      useBooksStore.getState().updateBookOptimistically(activeBookId, {
        progress: optimisticProgress,
        last_read_at: nowIso,
      })
      updateBookProgressInMemoryCache(activeBookId, optimisticProgress)

      try {
        const res = await readerApi.updateReadingProgress(activeBookId, {
          chapter_index: chIdx,
          scroll_offset: scrollOffset,
          percentage,
          reading_seconds_delta: delta,
        })
        if (res?.progress) {
          useBooksStore.getState().updateBookOptimistically(activeBookId, {
            progress: res.progress,
            last_read_at: res.progress.updated_at || nowIso,
          })
          updateBookProgressInMemoryCache(activeBookId, res.progress)
          onUpdatedRef.current?.()
        }
        return res?.progress ?? optimisticProgress
      } catch {
        return optimisticProgress
      }
    },
    [activeBookId, clampedSpreadIndex]
  )

  const syncCurrentProgress = useCallback(
    (force = false) => {
      if (!activeBookId) return
      let paraIdx = 0
      if (!isHiddenRef.current && getParaRef.current) {
        paraIdx = getParaRef.current()
        lastValidVisibleRef.current = { bookId: activeBookId, ch: chapterIndex, para: paraIdx }
      } else if (
        lastValidVisibleRef.current.bookId === activeBookId &&
        lastValidVisibleRef.current.ch === chapterIndex
      ) {
        paraIdx = lastValidVisibleRef.current.para
      } else if (lastReportedRef.current.ch === chapterIndex && lastReportedRef.current.para >= 0) {
        paraIdx = lastReportedRef.current.para
      } else {
        return
      }

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
      reportProgress(chapterIndex, paraIdx, pct, 0).catch(() => {})
    },
    [activeBookId, chapterIndex, clampedSpreadIndex, totalSpreads, totalChapters, totalParagraphs, reportProgress]
  )

  // Auto-sync on page-turn / spread change
  useEffect(() => {
    if (isHidden || !activeBookId) return
    const timer = setTimeout(() => {
      syncCurrentProgress(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [clampedSpreadIndex, chapterIndex, isHidden, activeBookId, syncCurrentProgress])

  // Scroll & visibility listeners (do NOT depend on isHidden so re-opening reader does not trigger cleanup overwrite)
  useEffect(() => {
    if (!activeBookId) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const onScroll = () => {
      if (isHiddenRef.current) return
      if (getParaRef.current) {
        lastValidVisibleRef.current = {
          bookId: activeBookId,
          ch: chapterIndex,
          para: getParaRef.current(),
        }
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => syncCurrentProgress(false), 800)
    }

    const onVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden' && !isHiddenRef.current) {
        syncCurrentProgress(true)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityOrUnload)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityOrUnload)
    }
  }, [activeBookId, chapterIndex, syncCurrentProgress])

  return { reportProgress, syncCurrentProgress }
}
