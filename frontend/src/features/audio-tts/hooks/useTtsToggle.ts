import { useCallback, useRef } from 'react'
import type { useTtsPlaybackState } from './useTtsPlaybackState'

interface TtsToggleOptions {
  state: ReturnType<typeof useTtsPlaybackState>
  audioElRef: React.MutableRefObject<HTMLAudioElement | null>
  selectedVoiceRef: React.MutableRefObject<string>
  ttsRateRef: React.MutableRefObject<number>
  paragraphsRef: React.MutableRefObject<string[]>
  activeParagraphIndex: number | null
  getVisibleParagraphIndex?: () => number
  getOrCreateAudioElement: () => HTMLAudioElement
  stopTTS: () => void
  speakParagraphAtIndex: (idx: number) => Promise<void>
  onActiveParagraphChange: (idx: number | null) => void
  abortInflightRequests?: () => void
  persistListeningCheckpoint: (
    idx: number,
    snip: string,
    cur: number,
    total: number,
    voice: string,
    rate: number
  ) => void
  syncServerProgress?: (idx: number, totalParas: number) => void
}

export function useTtsToggle(opts: TtsToggleOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  return useCallback(() => {
    const cur = optsRef.current
    const { state, audioElRef, selectedVoiceRef, ttsRateRef, paragraphsRef, activeParagraphIndex } = cur

    if (state.ttsPlaying && !state.ttsPaused) {
      cur.abortInflightRequests?.()
      if (audioElRef.current) {
        audioElRef.current.pause()
      }
      if (activeParagraphIndex !== null) {
        cur.persistListeningCheckpoint(
          activeParagraphIndex,
          state.activeSentenceSnippet,
          audioElRef.current?.currentTime || state.currentTimeSec,
          paragraphsRef.current.length,
          selectedVoiceRef.current,
          ttsRateRef.current
        )
        cur.syncServerProgress?.(activeParagraphIndex, paragraphsRef.current.length)
      }
      state.setTtsPaused(true)
      state.setTtsPlaying(false)
      state.setTtsLoading(false)
      return
    } else if (state.ttsPaused) {
      if (audioElRef.current && audioElRef.current.src) {
        audioElRef.current.playbackRate = ttsRateRef.current
        audioElRef.current.play().catch(() => {})
        state.setTtsPaused(false)
        state.setTtsPlaying(true)
        return
      }
      const targetIdx = activeParagraphIndex ?? (cur.getVisibleParagraphIndex ? cur.getVisibleParagraphIndex() : 0)
      cur.speakParagraphAtIndex(targetIdx)
    } else {
      cur.getOrCreateAudioElement()
      const targetIdx = activeParagraphIndex ?? (cur.getVisibleParagraphIndex ? cur.getVisibleParagraphIndex() : 0)
      cur.speakParagraphAtIndex(targetIdx)
    }
  }, [])
}
