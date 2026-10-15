import React, { useEffect, useRef } from 'react'
import type { ActiveTtsDrawer } from '../types'

export interface UseTtsChapterSyncOptions {
  bookId: string
  chapterIndex: number
  paragraphs: string[]
  isOpen: boolean
  activeDrawer: ActiveTtsDrawer
  setActiveDrawer: React.Dispatch<React.SetStateAction<ActiveTtsDrawer>>
  onClose: () => void
  speakParagraphAtIndex: (idx: number, overrideVoice?: string, startSec?: number) => void
  stopTTS: () => void
  onActiveParagraphChange: (idx: number | null) => void
  ttsPlaying: boolean
  ttsPaused: boolean
  pendingResumeRef: React.MutableRefObject<{
    bookId: string
    chapterIndex: number
    paragraphIndex: number
    audioTimeSec?: number
  } | null>
  prevChapterIndexRef: React.MutableRefObject<number>
  autoAdvanceChapterRef: React.MutableRefObject<boolean>
}

function useTtsDrawerKeyboard(
  isOpen: boolean,
  activeDrawer: ActiveTtsDrawer,
  setActiveDrawer: React.Dispatch<React.SetStateAction<ActiveTtsDrawer>>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDrawer !== 'none') setActiveDrawer('none')
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeDrawer, setActiveDrawer, onClose])
}

export function useTtsChapterSync({
  bookId,
  chapterIndex,
  paragraphs,
  isOpen,
  activeDrawer,
  setActiveDrawer,
  onClose,
  speakParagraphAtIndex,
  stopTTS,
  onActiveParagraphChange,
  ttsPlaying,
  ttsPaused,
  pendingResumeRef,
  prevChapterIndexRef,
  autoAdvanceChapterRef,
}: UseTtsChapterSyncOptions) {
  useTtsDrawerKeyboard(isOpen, activeDrawer, setActiveDrawer, onClose)

  useEffect(() => {
    const p = pendingResumeRef.current
    if (p && p.bookId === bookId && p.chapterIndex === chapterIndex && paragraphs.length > 0) {
      pendingResumeRef.current = null
      speakParagraphAtIndex(p.paragraphIndex, undefined, p.audioTimeSec)
    }
  }, [bookId, chapterIndex, paragraphs, speakParagraphAtIndex, pendingResumeRef])

  const prevBookIdForChapRef = useRef(bookId)
  const waitingForParasRef = useRef(false)

  useEffect(() => {
    if (prevBookIdForChapRef.current !== bookId) {
      prevBookIdForChapRef.current = bookId
      prevChapterIndexRef.current = chapterIndex
      waitingForParasRef.current = false
      stopTTS()
      onActiveParagraphChange(null)
      return
    }

    const chapterChanged = prevChapterIndexRef.current !== chapterIndex
    if (chapterChanged || waitingForParasRef.current) {
      if (paragraphs.length === 0) {
        waitingForParasRef.current = true
        return
      }
      waitingForParasRef.current = false
      prevChapterIndexRef.current = chapterIndex
      if (pendingResumeRef.current && pendingResumeRef.current.chapterIndex === chapterIndex) {
        return
      }
      if (autoAdvanceChapterRef.current) {
        autoAdvanceChapterRef.current = false
        speakParagraphAtIndex(0)
      } else if (ttsPlaying || ttsPaused) {
        stopTTS()
        onActiveParagraphChange(null)
      }
    }
  }, [
    bookId,
    chapterIndex,
    paragraphs,
    speakParagraphAtIndex,
    stopTTS,
    onActiveParagraphChange,
    ttsPlaying,
    ttsPaused,
    prevChapterIndexRef,
    pendingResumeRef,
    autoAdvanceChapterRef,
  ])
}
