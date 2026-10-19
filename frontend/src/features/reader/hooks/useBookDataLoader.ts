import { useState, useEffect, useCallback, useRef } from 'react'
import type { BookFullContent } from '../types'
import { getBookFromMemoryCache, getBookWithCache } from '../../../utils/bookCache'
import { mergeRawChapters } from '../helpers/bookContentHelpers'

export function useBookDataLoader(activeBookId: string, hintChapterIndex?: number) {
  const [rawContentData, setRawContentData] = useState<BookFullContent | null>(() =>
    getBookFromMemoryCache(activeBookId)
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fromLruCache, setFromLruCache] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  // Ensure content setter preserves loaded full chapters during partial updates
  const setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>> = useCallback(
    (updater) => {
      setRawContentData((prevRaw) => {
        const nextVal = typeof updater === 'function' ? updater(prevRaw) : updater
        if (!nextVal || !prevRaw || prevRaw.book.id !== nextVal.book.id) return nextVal
        return mergeRawChapters(prevRaw, nextVal)
      })
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    // Pre-sync memory cache when activeBookId switches
    const mem = getBookFromMemoryCache(activeBookId)
    if (mem && mem.book.id === activeBookId) {
      setRawContentData(mem)
    } else {
      setRawContentData(null)
    }

    // Safety timeout: 7.5s fallback to prevent eternal loading hang
    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        setLoadError('网络连接缓慢或无响应，点击重试可重新连接')
      }
    }, 7500)

    getBookWithCache(activeBookId, false, hintChapterIndex, (hydrated) => {
      if (!cancelled) setRawContentData(hydrated)
    })
      .then(({ data, fromCache }) => {
        if (cancelled) return
        window.clearTimeout(safetyTimer)
        setRawContentData(data)
        setFromLruCache(fromCache)
      })
      .catch((err) => {
        if (cancelled) return
        window.clearTimeout(safetyTimer)
        setLoadError(err?.message || '网络连接波动，书籍内容加载失败')
      })

    return () => {
      cancelled = true
      window.clearTimeout(safetyTimer)
    }
  }, [activeBookId, retryTick, hintChapterIndex])

  const retry = useCallback(() => setRetryTick((t) => t + 1), [])

  return { rawContentData, setContentData, loadError, fromLruCache, retry }
}
