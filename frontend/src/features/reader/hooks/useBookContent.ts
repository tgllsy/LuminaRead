import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { BookFullContent, JumpTarget, BookSummary } from '../types'
import { getBookFromMemoryCache, getBookWithCache } from '../../../utils/bookCache'
import { useTypographyStore } from '../../../stores/typographyStore'
import { convertBookFullContent } from '../../../utils/chineseConversion'

interface UseBookContentOptions {
  activeBookId: string
  allBooks: BookSummary[]
  jumpTarget: JumpTarget | null
  onChapterChange?: (chapterIndex: number) => void
}

function resolveTargetChapterIndex(
  activeBookId: string,
  allBooks: BookSummary[],
  jumpTarget: JumpTarget | null,
  remoteProgressCh?: number
): number {
  if (jumpTarget?.bookId === activeBookId && jumpTarget.chapterIndex !== undefined) {
    return jumpTarget.chapterIndex
  }
  if (remoteProgressCh !== undefined && remoteProgressCh >= 0) {
    return remoteProgressCh
  }
  const hint = allBooks.find((b) => b.id === activeBookId)
  return hint?.progress?.chapter_index ?? 0
}

export function useBookContent({
  activeBookId,
  allBooks,
  jumpTarget,
  onChapterChange,
}: UseBookContentOptions) {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const [rawContentData, setRawContentData] = useState<BookFullContent | null>(() =>
    getBookFromMemoryCache(activeBookId)
  )

  // Wrap setter so updates derived from converted display state never overwrite
  // already-loaded raw chapter texts with simplified/traditional converted text.
  const setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>> = useCallback(
    (updater) => {
      setRawContentData((prevRaw) => {
        const nextVal = typeof updater === 'function' ? updater(prevRaw) : updater
        if (!nextVal || !prevRaw || prevRaw.book.id !== nextVal.book.id) {
          return nextVal
        }
        // Preserve existing raw chapters unless a previously _partial chapter was newly hydrated
        const mergedChapters = nextVal.chapters.map((ch, idx) => {
          const prevCh = prevRaw.chapters[idx]
          if (prevCh && !prevCh._partial && prevCh.content) {
            return prevCh
          }
          return ch
        })
        return {
          ...nextVal,
          book: prevRaw.book,
          chapters: mergedChapters,
        }
      })
    },
    []
  )

  const contentData = useMemo(
    () => convertBookFullContent(rawContentData, chineseVariant),
    [rawContentData, chineseVariant]
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const [fromLruCache, setFromLruCache] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(() =>
    resolveTargetChapterIndex(activeBookId, allBooks, jumpTarget, 0)
  )

  const allBooksRef = useRef(allBooks)
  allBooksRef.current = allBooks
  const jumpTargetRef = useRef(jumpTarget)
  jumpTargetRef.current = jumpTarget
  const onChapterChangeRef = useRef(onChapterChange)
  onChapterChangeRef.current = onChapterChange
  const consumedJumpTargetRef = useRef<JumpTarget | null>(null)
  const userSelectedBookRef = useRef<string | null>(null)

  const setUserChapterIndex = useCallback(
    (next: React.SetStateAction<number>) => {
      userSelectedBookRef.current = activeBookId
      setChapterIndex(next)
    },
    [activeBookId]
  )

  useEffect(() => {
    if (contentData?.book?.id === activeBookId) onChapterChangeRef.current?.(chapterIndex)
  }, [chapterIndex, contentData?.book?.id, activeBookId])

  useEffect(() => {
    if (!contentData || contentData.book.id !== activeBookId) return
    if (
      jumpTarget &&
      jumpTarget !== consumedJumpTargetRef.current &&
      jumpTarget.bookId === activeBookId &&
      jumpTarget.chapterIndex !== undefined
    ) {
      consumedJumpTargetRef.current = jumpTarget
      const resolved = Math.max(0, Math.min(jumpTarget.chapterIndex, Math.max(0, contentData.chapters.length - 1)))
      setChapterIndex((prev) => (prev === resolved ? prev : resolved))
    }
  }, [jumpTarget, activeBookId, contentData])

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    const jt = jumpTargetRef.current
    const hint = allBooksRef.current.find((b) => b.id === activeBookId)
    const hintCh = jt?.bookId === activeBookId && jt.chapterIndex !== undefined ? jt.chapterIndex : hint?.progress?.chapter_index

    getBookWithCache(activeBookId, false, hintCh, (hydrated) => {
      if (!cancelled) setRawContentData(hydrated)
    })
      .then(({ data, fromCache }) => {
        if (cancelled) return
        setRawContentData(data)
        setFromLruCache(fromCache)
        const maxIdx = Math.max(0, (data.chapters?.length || 1) - 1)
        if (userSelectedBookRef.current === activeBookId) {
          setChapterIndex((prev) => Math.max(0, Math.min(prev, maxIdx)))
          return
        }
        const targetCh = resolveTargetChapterIndex(
          activeBookId,
          allBooksRef.current,
          jumpTargetRef.current,
          data.progress?.chapter_index ?? 0
        )
        if (jumpTargetRef.current?.bookId === activeBookId) {
          consumedJumpTargetRef.current = jumpTargetRef.current
        }
        const resolved = Math.max(0, Math.min(targetCh, maxIdx))
        setChapterIndex(resolved)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || '网络连接波动，书籍内容加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [activeBookId, retryTick])

  const retry = useCallback(() => setRetryTick((t) => t + 1), [])

  return { contentData, setContentData, loadError, fromLruCache, chapterIndex, setChapterIndex: setUserChapterIndex, retry }
}
