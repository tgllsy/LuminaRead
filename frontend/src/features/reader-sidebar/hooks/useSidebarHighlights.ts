import { useState, useCallback } from 'react'
import type { BookSummary, NotesViewMode } from '../types'
import { sidebarApi } from '../api'
import { triggerMarkdownDownload } from '../helpers'
import {
  MIN_MINDMAP_ZOOM,
  MAX_MINDMAP_ZOOM,
  MINDMAP_ZOOM_STEP,
  SYNC_MSG_TIMEOUT_MS,
} from '../constants'

export function useSidebarHighlights(book: BookSummary) {
  const [notesViewMode, setNotesViewMode] = useState<NotesViewMode>('list')
  const [colorFilter, setColorFilter] = useState<string>('all')
  const [chapterFilter, setChapterFilter] = useState<number | 'all'>('all')
  const [mindmapZoom, setMindmapZoom] = useState<number>(1)
  const [syncMsg, setSyncMsg] = useState('')

  const handleExportMd = useCallback(async () => {
    try {
      const data = await sidebarApi.exportMarkdown(book.id)
      if (data.markdown) {
        triggerMarkdownDownload(
          data.markdown,
          data.filename || `《${book.title}》笔记.md`
        )
      }
    } catch (err) {
      console.error('Export markdown failed:', err)
    }
  }, [book.id, book.title])

  const handlePushLifeOS = useCallback(async () => {
    try {
      const data = await sidebarApi.syncLifeOs(book.id)
      if (data.summary) {
        setSyncMsg(data.summary)
        setTimeout(() => setSyncMsg(''), SYNC_MSG_TIMEOUT_MS)
      }
    } catch (err) {
      console.error('Push LifeOS failed:', err)
    }
  }, [book.id])

  const zoomIn = useCallback(() => {
    setMindmapZoom((z) =>
      Math.min(MAX_MINDMAP_ZOOM, Number((z + MINDMAP_ZOOM_STEP).toFixed(1)))
    )
  }, [])

  const zoomOut = useCallback(() => {
    setMindmapZoom((z) =>
      Math.max(MIN_MINDMAP_ZOOM, Number((z - MINDMAP_ZOOM_STEP).toFixed(1)))
    )
  }, [])

  const resetZoom = useCallback(() => setMindmapZoom(1), [])

  return {
    notesViewMode,
    setNotesViewMode,
    colorFilter,
    setColorFilter,
    chapterFilter,
    setChapterFilter,
    mindmapZoom,
    syncMsg,
    handleExportMd,
    handlePushLifeOS,
    zoomIn,
    zoomOut,
    resetZoom,
  }
}
