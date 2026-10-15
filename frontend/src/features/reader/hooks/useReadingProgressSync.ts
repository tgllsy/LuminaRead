import { useEffect, useCallback, useRef } from 'react'
import { readerApi } from '../api'
import { useBooksStore } from '../../../shared/stores/useBooksStore'

interface UseReadingProgressSyncOptions {
  activeBookId: string
  chapterIndex?: number
  getCurrentVisibleParagraphIndex?: () => number
  totalChapters?: number
  totalParagraphs?: number
  onBookStateUpdated: () => void
  isHidden?: boolean
}

export function useReadingProgressSync({
  activeBookId,
  chapterIndex = 0,
  getCurrentVisibleParagraphIndex,
  totalChapters = 1,
  totalParagraphs = 1,
  onBookStateUpdated,
  isHidden = false,
}: UseReadingProgressSyncOptions) {
  const onUpdatedRef = useRef(onBookStateUpdated)
  onUpdatedRef.current = onBookStateUpdated
  const lastReportedRef = useRef<{ ch: number; para: number }>({ ch: -1, para: -1 })
  const getParaRef = useRef(getCurrentVisibleParagraphIndex)
  getParaRef.current = getCurrentVisibleParagraphIndex

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
    async (
      chIdx: number,
      scrollOffset: number,
      percentage: number,
      delta: number = 45
    ) => {
      if (!activeBookId) return null
      try {
        lastReportedRef.current = { ch: chIdx, para: scrollOffset }
        const res = await readerApi.updateReadingProgress(activeBookId, {
          chapter_index: chIdx,
          scroll_offset: scrollOffset,
          percentage,
          reading_seconds_delta: delta,
        })
        if (res?.progress) {
          useBooksStore.getState().updateBookOptimistically(activeBookId, { progress: res.progress })
        }
        return res.progress
      } catch {
        return null
      }
    },
    [activeBookId]
  )

  // Debounced auto-save on scroll and unload
  useEffect(() => {
    if (isHidden || !activeBookId || !getParaRef.current) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const handleSync = () => {
      if (isHidden) return
      const getPara = getParaRef.current
      if (!getPara) return
      const paraIdx = getPara()
      const prev = lastReportedRef.current
      if (prev.ch === chapterIndex && prev.para === paraIdx) return

      const totalParas = Math.max(1, totalParagraphs)
      const paraFraction = Math.min(1, Math.max(0, paraIdx / totalParas))
      const pct = Math.min(
        100,
        Math.max(0, Math.round(((chapterIndex + paraFraction) / Math.max(1, totalChapters)) * 100))
      )
      reportProgress(chapterIndex, paraIdx, pct, 10).catch(() => {})
    }

    const onScroll = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(handleSync, 1200)
    }

    const onVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') handleSync()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityOrUnload)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityOrUnload)
      handleSync()
    }
  }, [isHidden, activeBookId, chapterIndex, totalChapters, totalParagraphs, reportProgress])

  return { reportProgress }
}
