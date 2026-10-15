import { useCallback, useRef } from 'react'
import type { useTtsPlaybackState } from './useTtsPlaybackState'
import { useTtsStore } from '../../../stores/ttsStore'

interface TtsStopOptions {
  state: ReturnType<typeof useTtsPlaybackState>
  playbackSessionRef: React.MutableRefObject<number>
  autoAdvanceChapterRef: React.MutableRefObject<boolean>
  abortActiveAudioElements: () => void
  abortInflightRequests?: () => void
}

export function useTtsStop(opts: TtsStopOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  return useCallback(() => {
    const { state, playbackSessionRef, autoAdvanceChapterRef, abortActiveAudioElements, abortInflightRequests } = optsRef.current
    playbackSessionRef.current += 1
    autoAdvanceChapterRef.current = false
    abortInflightRequests?.()
    abortActiveAudioElements()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    }
    state.setTtsPlaying(false)
    state.setTtsPaused(false)
    state.setTtsLoading(false)
    state.setParaProgress(0)
    state.setCurrentTimeSec(0)
    state.setDurationSec(0)
    state.setActiveSentenceSnippet('')
    useTtsStore.getState().setActiveSentence('')
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'none' } catch { /* ignore */ }
    }
  }, [])
}
