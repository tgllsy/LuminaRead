import { useCallback, useRef } from 'react'
import type { TtsCheckpoint } from '../types'
import { isNonSpokenMarkerParagraph } from '../helpers'

interface UseTtsNavigationOptions {
  bookId: string
  chapterIndex: number
  activeParagraphIndex: number | null
  paragraphsRef: React.MutableRefObject<string[]>
  speakParagraphAtIndex: (startIdx: number, overrideVoice?: string, initialSeekSec?: number) => Promise<void>
  onSelectChapter?: (cIdx: number) => void
  getOrCreateAudioElement: () => HTMLAudioElement
}

export function useTtsNavigation(opts: UseTtsNavigationOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  const pendingResumeRef = useRef<{
    bookId: string
    chapterIndex: number
    paragraphIndex: number
    audioTimeSec: number
  } | null>(null)

  const stepPrevParagraph = useCallback(() => {
    const cur = optsRef.current
    let idx = (cur.activeParagraphIndex ?? 0) - 1
    while (idx >= 0 && isNonSpokenMarkerParagraph(cur.paragraphsRef.current[idx])) {
      idx -= 1
    }
    cur.speakParagraphAtIndex(Math.max(0, idx))
  }, [])

  const stepNextParagraph = useCallback(() => {
    const cur = optsRef.current
    cur.speakParagraphAtIndex((cur.activeParagraphIndex ?? 0) + 1)
  }, [])

  const handleResumeCheckpoint = useCallback(
    (cp: TtsCheckpoint) => {
      const cur = optsRef.current
      cur.getOrCreateAudioElement()
      if (cp.chapterIndex === cur.chapterIndex && cur.paragraphsRef.current.length > 0) {
        cur.speakParagraphAtIndex(cp.paragraphIndex, undefined, cp.audioTimeSec)
      } else {
        pendingResumeRef.current = {
          bookId: cp.bookId || cur.bookId,
          chapterIndex: cp.chapterIndex,
          paragraphIndex: cp.paragraphIndex,
          audioTimeSec: cp.audioTimeSec,
        }
        cur.onSelectChapter?.(cp.chapterIndex)
      }
    },
    []
  )

  const handlePlayParagraphTarget = useCallback(
    (pIdx: number, cIdx: number) => {
      const cur = optsRef.current
      cur.getOrCreateAudioElement()
      if (cIdx === cur.chapterIndex && cur.paragraphsRef.current.length > 0) {
        cur.speakParagraphAtIndex(pIdx)
      } else {
        pendingResumeRef.current = {
          bookId: cur.bookId,
          chapterIndex: cIdx,
          paragraphIndex: pIdx,
          audioTimeSec: 0,
        }
        cur.onSelectChapter?.(cIdx)
      }
    },
    []
  )

  return {
    stepPrevParagraph,
    stepNextParagraph,
    handleResumeCheckpoint,
    handlePlayParagraphTarget,
    pendingResumeRef,
  }
}
