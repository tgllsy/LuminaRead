import { useState, useRef, useEffect, useCallback } from 'react'
import type { TtsCheckpoint } from '../types'
import { loadBookTtsCheckpoint, saveBookTtsCheckpoint } from '../helpers'
import { updateReadingProgress } from '../api'

interface UseTtsCheckpointOptions {
  bookId: string
  bookTitle: string
  bookAuthor?: string
  coverUrl?: string
  coverColor?: string
  chapterIndex: number
  chapterTitle?: string
  isOpen: boolean
  onCheckpointSaved?: (cp: TtsCheckpoint) => void
}

export function useTtsCheckpoint({
  bookId,
  bookTitle,
  bookAuthor = '阅境伴读',
  coverUrl = '',
  coverColor = '#2b593f',
  chapterIndex,
  chapterTitle = '',
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

  const syncServerProgress = useCallback((curIdx: number, totalLen: number) => {
    if (!bookId) return
    const pct = Math.min(100, Math.round(((curIdx + 1) / Math.max(1, totalLen)) * 100))
    updateReadingProgress(bookId, { current_chapter: chapterIndex, scroll_progress: pct }).catch(() => {})
  }, [bookId, chapterIndex])

  return {
    savedCheckpoint,
    setSavedCheckpoint,
    lastCheckpointWriteRef,
    persistListeningCheckpoint,
    syncServerProgress,
  }
}
