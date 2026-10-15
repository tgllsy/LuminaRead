import { useCallback } from 'react'
import type { BookFullContent } from '../types'
import { readerApi } from '../api'
import { setBookInMemoryCache } from '../../../utils/bookCache'

interface UseReaderBookmarksOptions {
  bookId: string
  chapterIndex: number
  currentChapterTitle: string
  contentData: BookFullContent | null
  setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>>
  getCurrentVisibleParagraphIndex: () => number
  paragraphs: string[]
  chaptersCount: number
  setBookmarkToast: (msg: string) => void
}

export function useReaderBookmarks({
  bookId,
  chapterIndex,
  currentChapterTitle,
  contentData,
  setContentData,
  getCurrentVisibleParagraphIndex,
  paragraphs,
  chaptersCount,
  setBookmarkToast,
}: UseReaderBookmarksOptions) {
  const handleAddBookmark = useCallback(async () => {
    if (!contentData) return
    const visibleIdx = getCurrentVisibleParagraphIndex()
    const snippet =
      paragraphs[visibleIdx]?.slice(0, 90) ||
      paragraphs[0]?.slice(0, 90) ||
      currentChapterTitle
    const percentage = Math.round(((chapterIndex + 1) / Math.max(1, chaptersCount)) * 100)
    const { bookmark } = await readerApi.createBookmark(bookId, {
      chapter_index: chapterIndex,
      chapter_title: currentChapterTitle,
      scroll_offset: visibleIdx,
      snippet,
      percentage,
    })
    setContentData((prev) => {
      if (!prev) return prev
      const updated = { ...prev, bookmarks: [bookmark, ...prev.bookmarks] }
      setBookInMemoryCache(bookId, updated)
      return updated
    })
    setBookmarkToast('已添加当前阅读位置书签')
    setTimeout(() => setBookmarkToast(''), 2000)
  }, [bookId, chapterIndex, currentChapterTitle, contentData, getCurrentVisibleParagraphIndex, paragraphs, chaptersCount, setContentData, setBookmarkToast])

  const handleDeleteBookmark = useCallback(
    async (bmId: string) => {
      if (!contentData) return
      await readerApi.deleteBookmark(bmId)
      setContentData((prev) => {
        if (!prev) return prev
        const next = prev.bookmarks.filter((b) => b.id !== bmId)
        const updated = { ...prev, bookmarks: next }
        setBookInMemoryCache(bookId, updated)
        return updated
      })
    },
    [bookId, contentData, setContentData]
  )

  return { handleAddBookmark, handleDeleteBookmark }
}
