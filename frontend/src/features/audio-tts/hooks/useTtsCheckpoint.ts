import { useState, useRef, useEffect, useCallback } from 'react'
import type { TtsCheckpoint } from '../types'
import { loadBookTtsCheckpoint, saveBookTtsCheckpoint } from '../helpers'
import { updateReadingProgress } from '../api'

import { useBooksStore } from '../../../shared/stores/useBooksStore'

interface UseTtsCheckpointOptions {
  bookId: string
  bookTitle: string
  bookAuthor?: string
  coverUrl?: string
  coverColor?: string
  chapterIndex: number
  chapterTitle?: string
  totalChapters?: number
  isOpen: boolean
  onCheckpointSaved?: (cp: TtsCheckpoint) => void
}

function calculateTtsProgressPct(
  chapterIndex: number,
  totalChapters: number,
  curIdx: number,
  totalLen: number
): number {
  const safeTotalCh = Math.max(1, totalChapters)
  const fraction = totalLen > 1 ? Math.min(1, Math.max(0, curIdx / (totalLen - 1))) : 0
  return Math.min(100, Math.max(0, Math.round(((chapterIndex + fraction) / safeTotalCh) * 100)))
}

export function useTtsCheckpoint({
  bookId,
  bookTitle,
  bookAuthor = '阅境伴读',
  coverUrl = '',
  coverColor = '#2b593f',
  chapterIndex,
  chapterTitle = '',
  totalChapters = 1,
  isOpen,
  onCheckpointSaved,
}: UseTtsCheckpointOptions) {
  const [savedCheckpoint, setSavedCheckpoint] = useState<TtsCheckpoint | null>(() =>
    loadBookTtsCheckpoint(bookId)
  )
  const lastCheckpointWriteRef = useRef<number>(0)

  useEffect(() => {
    if (bookId) {
      setSavedCheckpoint(loadBookTtsCheckpoint(bookId))
    }
  }, [bookId, isOpen])

  const persistListeningCheckpoint = useCallback(
    (paraIdx: number, snippetText: string, timeSec: number, totalParagraphs: number, voice: string, rate: number) => {
      if (!bookId) return
      const cp: TtsCheckpoint = {
        bookId,
        bookTitle,
        bookAuthor,
        coverUrl,
        coverColor,
        chapterIndex,
        chapterTitle: chapterTitle || `第 ${chapterIndex + 1} 章`,
        paragraphIndex: Math.max(0, paraIdx),
        totalParagraphs: Math.max(1, totalParagraphs),
        snippet: (snippetText || '').slice(0, 90),
        audioTimeSec: Math.max(0, Math.round(timeSec * 10) / 10),
        voice,
        rate,
        updatedAt: Date.now(),
      }
      saveBookTtsCheckpoint(bookId, cp)
      setSavedCheckpoint(cp)
      onCheckpointSaved?.(cp)
    },
    [bookId, bookTitle, bookAuthor, coverUrl, coverColor, chapterIndex, chapterTitle, onCheckpointSaved]
  )

  const syncServerProgress = useCallback(
    (curIdx: number, totalLen: number) => {
      if (!bookId) return
      const pct = calculateTtsProgressPct(chapterIndex, totalChapters, curIdx, totalLen)
      updateReadingProgress(bookId, {
        chapter_index: chapterIndex,
        scroll_offset: curIdx,
        percentage: pct,
        reading_seconds_delta: 0,
      })
        .then((res) => {
          const nowIso = new Date().toISOString()
          useBooksStore.getState().updateBookOptimistically(bookId, {
            progress: res?.progress || {
              book_id: bookId,
              chapter_index: chapterIndex,
              scroll_offset: curIdx,
              percentage: pct,
              updated_at: nowIso,
            },
            last_read_at: nowIso,
          })
        })
        .catch(() => {})
    },
    [bookId, chapterIndex, totalChapters]
  )

  return {
    savedCheckpoint,
    setSavedCheckpoint,
    lastCheckpointWriteRef,
    persistListeningCheckpoint,
    syncServerProgress,
  }
}
