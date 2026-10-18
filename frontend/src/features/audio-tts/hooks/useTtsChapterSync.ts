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

  const prevBookIdForChapRef = useRef(bookId)
  const waitingForParasRef = useRef(false)

  useEffect(() => {
    // 1. 书籍切换：彻底重置并停止
    if (prevBookIdForChapRef.current !== bookId) {
      prevBookIdForChapRef.current = bookId
      prevChapterIndexRef.current = chapterIndex
      waitingForParasRef.current = false
      stopTTS()
      onActiveParagraphChange(null)
      return
    }

    // 2. 如果正文段落尚未就绪，等待加载就绪
    if (paragraphs.length === 0) {
      waitingForParasRef.current = true
      return
    }
    const hadWaited = waitingForParasRef.current
    waitingForParasRef.current = false

    const chapterChanged = prevChapterIndexRef.current !== chapterIndex
    prevChapterIndexRef.current = chapterIndex

    // 3. 优先级 1：检查是否有待处理的恢复播放请求（pendingResume）
    const pending = pendingResumeRef.current
    if (pending && pending.bookId === bookId && pending.chapterIndex === chapterIndex) {
      pendingResumeRef.current = null
      speakParagraphAtIndex(pending.paragraphIndex, undefined, pending.audioTimeSec)
      return
    }

    // 4. 优先级 2：自动顺延下一章
    if (autoAdvanceChapterRef.current && (chapterChanged || hadWaited)) {
      autoAdvanceChapterRef.current = false
      speakParagraphAtIndex(0)
      return
    }

    // 5. 优先级 3：章节改变且不是听书驱动（用户外部翻章），若正在播放则停止
    if (chapterChanged && (ttsPlaying || ttsPaused)) {
      stopTTS()
      onActiveParagraphChange(null)
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
