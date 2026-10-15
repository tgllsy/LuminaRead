import { useRef, useCallback, useEffect } from 'react'
import { createGaplessAudioDeckPool, type GaplessAudioDeckManager } from '../helpers/gaplessAudioDeck'

function abortSingleAudio(el: HTMLAudioElement | null): void {
  if (!el) return
  try {
    el.onended = null
    el.onerror = null
    el.ontimeupdate = null
    el.onloadedmetadata = null
    el.pause()
    el.removeAttribute('src')
    el.load()
  } catch {
    // ignore
  }
}

function cancelSpeechSynthesisSafe(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
}

export function useAudioPlayback(ttsRate: number) {
  const deckManagerRef = useRef<GaplessAudioDeckManager | null>(null)
  if (!deckManagerRef.current && typeof window !== 'undefined') {
    deckManagerRef.current = createGaplessAudioDeckPool()
  }

  const audioElRef = useRef<HTMLAudioElement | null>(null)
  if (deckManagerRef.current) {
    audioElRef.current = deckManagerRef.current.getActiveAudio()
  }
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const getOrCreateAudioElement = useCallback((): HTMLAudioElement => {
    if (!deckManagerRef.current && typeof window !== 'undefined') {
      deckManagerRef.current = createGaplessAudioDeckPool()
    }
    const active = deckManagerRef.current?.getActiveAudio()
    if (active) {
      audioElRef.current = active
      return active
    }
    if (!audioElRef.current) {
      audioElRef.current = new Audio()
    }
    return audioElRef.current
  }, [])

  const abortActiveAudioElements = useCallback(() => {
    if (deckManagerRef.current) {
      deckManagerRef.current.resetAll()
      audioElRef.current = deckManagerRef.current.getActiveAudio()
    } else if (audioElRef.current) {
      abortSingleAudio(audioElRef.current)
    }
    utteranceRef.current = null
    cancelSpeechSynthesisSafe()
  }, [])

  useEffect(() => {
    return () => {
      abortActiveAudioElements()
    }
  }, [abortActiveAudioElements])

  useEffect(() => {
    if (deckManagerRef.current) {
      deckManagerRef.current.setPlaybackRate(ttsRate)
    } else if (audioElRef.current) {
      audioElRef.current.playbackRate = ttsRate
    }
  }, [ttsRate])

  const seekBySeconds = useCallback((deltaSec: number, durationSec: number, onSeek: (cur: number) => void) => {
    const audio = deckManagerRef.current?.getActiveAudio() || audioElRef.current
    if (audio && durationSec > 0) {
      const next = Math.min(
        durationSec,
        Math.max(0, (audio.currentTime || 0) + deltaSec)
      )
      audio.currentTime = next
      onSeek(next)
    }
  }, [])

  return {
    audioElRef,
    deckManagerRef,
    utteranceRef,
    getOrCreateAudioElement,
    abortActiveAudioElements,
    seekBySeconds,
  }
}
