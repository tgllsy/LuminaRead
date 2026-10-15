import { useCallback } from 'react'
import type { BookFullContent, SelectionState, HighlightItem } from '../types'
import { readerApi } from '../api'
import { setBookInMemoryCache, getBookWithCache } from '../../../utils/bookCache'

interface UseReaderHighlightsOptions {
  bookId: string
  chapterIndex: number
  currentChapterTitle: string
  contentData: BookFullContent | null
  setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>>
  selectionState: SelectionState | null
  setSelectionState: React.Dispatch<React.SetStateAction<SelectionState | null>>
  onBookStateUpdated: () => void
}

export function useReaderHighlights({
  bookId, chapterIndex, currentChapterTitle, contentData,
  setContentData, selectionState, setSelectionState, onBookStateUpdated,
}: UseReaderHighlightsOptions) {
  const handleCreateOrUpdateHighlight = useCallback(
    async (payload: { color: HighlightItem['color']; style_type: HighlightItem['style_type']; note: string }) => {
      if (!selectionState || !contentData) return
      let nextHl: HighlightItem
      if (selectionState.existing) {
        const res = await readerApi.updateHighlight(selectionState.existing.id, payload)
        nextHl = res.highlight
      } else {
        const targetCh = selectionState.chapterIndex ?? chapterIndex
        const targetTitle = contentData.chapters[targetCh]?.title || currentChapterTitle
        const res = await readerApi.createHighlight(bookId, {
          chapter_index: targetCh,
          chapter_title: targetTitle,
          selected_text: selectionState.text,
          paragraph_index: selectionState.paragraphIndex,
          end_paragraph_index: selectionState.endParagraphIndex,
          start_offset: selectionState.startOffset,
          end_offset: selectionState.endOffset,
          cfi_range:
            selectionState.endParagraphIndex !== undefined
              ? `p${selectionState.paragraphIndex}:p${selectionState.endParagraphIndex}`
              : undefined,
          style_type: payload.style_type,
          color: payload.color,
          note: payload.note,
        })
        nextHl = {
          ...res.highlight,
          end_paragraph_index:
            selectionState.endParagraphIndex ?? res.highlight.end_paragraph_index,
          start_offset: selectionState.startOffset ?? res.highlight.start_offset,
          end_offset: selectionState.endOffset ?? res.highlight.end_offset,
        }
      }
      setContentData((prev) => {
        if (!prev) return prev
        const nextHighlights = selectionState.existing
          ? prev.highlights.map((h) => (h.id === nextHl.id ? nextHl : h))
          : [...prev.highlights, nextHl]
        const updated = { ...prev, highlights: nextHighlights }
        setBookInMemoryCache(bookId, updated)
        return updated
      })
      setSelectionState((p) => (p ? { ...p, existing: nextHl } : null))
      onBookStateUpdated()
    },
    [bookId, chapterIndex, currentChapterTitle, contentData, selectionState, setContentData, setSelectionState, onBookStateUpdated]
  )

  const handleDeleteHighlight = useCallback(async (hlId: string) => {
    if (!contentData) return
    await readerApi.deleteHighlight(hlId)
    setContentData((prev) => {
      if (!prev) return prev
      const updated = { ...prev, highlights: prev.highlights.filter((h) => h.id !== hlId) }
      setBookInMemoryCache(bookId, updated)
      return updated
    })
    setSelectionState(null)
    onBookStateUpdated()
  }, [bookId, contentData, setContentData, setSelectionState, onBookStateUpdated])

  const handleSaveInsightAsNote = useCallback(async (text: string, noteContent: string) => {
    if (!contentData) return
    await readerApi.createHighlight(bookId, {
      chapter_index: chapterIndex, chapter_title: currentChapterTitle, selected_text: text,
      paragraph_index: 0, style_type: 'marker', color: 'purple',
      note: `[AI伴读洞察] ${noteContent.slice(0, 220)}`,
    })
    const refreshed = await getBookWithCache(bookId, true)
    setContentData(refreshed.data)
    onBookStateUpdated()
  }, [bookId, chapterIndex, currentChapterTitle, contentData, setContentData, onBookStateUpdated])

  return { handleCreateOrUpdateHighlight, handleDeleteHighlight, handleSaveInsightAsNote }
}
