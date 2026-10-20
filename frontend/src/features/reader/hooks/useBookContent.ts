import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { JumpTarget, BookSummary } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import { convertBookFullContent } from '../../../utils/chineseConversion'
import { resolveTargetChapterIndex } from '../helpers/bookContentHelpers'
import { useBookDataLoader } from './useBookDataLoader'

interface UseBookContentOptions {
  activeBookId: string
  allBooks: BookSummary[]
  jumpTarget: JumpTarget | null
  onChapterChange?: (chapterIndex: number) => void
}

export function useBookContent({
  activeBookId,
  allBooks,
  jumpTarget,
  onChapterChange,
}: UseBookContentOptions) {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const allBooksRef = useRef(allBooks)
  allBooksRef.current = allBooks
  const jumpTargetRef = useRef(jumpTarget)
  jumpTargetRef.current = jumpTarget
  const onChapterChangeRef = useRef(onChapterChange)
  onChapterChangeRef.current = onChapterChange

  const hint = allBooks.find((b) => b.id === activeBookId)
  const hintCh = jumpTarget?.bookId === activeBookId && jumpTarget.chapterIndex !== undefined
    ? jumpTarget.chapterIndex
    : hint?.progress?.chapter_index

  const { rawContentData, setContentData, loadError, fromLruCache, retry } = useBookDataLoader(
    activeBookId,
    hintCh
  )

  const contentData = useMemo(
    () => convertBookFullContent(rawContentData, chineseVariant),
    [rawContentData, chineseVariant]
  )

  const [chapterIndex, setChapterIndex] = useState(() =>
    resolveTargetChapterIndex(activeBookId, allBooks, jumpTarget, 0)
  )
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
    const maxIdx = Math.max(0, (contentData.chapters?.length || 1) - 1)

    const jt = jumpTargetRef.current
    if (jt && jt !== consumedJumpTargetRef.current && jt.bookId === activeBookId && jt.chapterIndex !== undefined) {
      consumedJumpTargetRef.current = jt
      const resolved = Math.max(0, Math.min(jt.chapterIndex, maxIdx))
      setChapterIndex((prev) => (prev === resolved ? prev : resolved))
      return
    }

    if (userSelectedBookRef.current === activeBookId) {
      setChapterIndex((prev) => Math.max(0, Math.min(prev, maxIdx)))
      return
    }

    const targetCh = resolveTargetChapterIndex(
      activeBookId,
      allBooksRef.current,
      jt,
      contentData.progress?.chapter_index ?? 0
    )
    setChapterIndex(Math.max(0, Math.min(targetCh, maxIdx)))
  }, [contentData, activeBookId, jumpTarget])

  return {
    contentData,
    setContentData,
    loadError,
    fromLruCache,
    chapterIndex,
    setChapterIndex: setUserChapterIndex,
    retry,
  }
}
