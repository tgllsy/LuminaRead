import { computeActiveSentence, isNonSpokenMarkerParagraph, computeSentenceProgress } from '../helpers'
import { resolveSentenceVoice } from './dialogueSpeaker'
import { useTtsStore } from '../../../stores/ttsStore'

export interface AudioSessionHandlers {
  sessionId: number
  getSessionId: () => number
  text: string
  idx: number
  totalParas: number
  voiceToUse: string
  estDur: number
  initialSeekSec: number
  ttsRate: number
  onDurationChange: (dur: number) => void
  onTimeUpdate: (cur: number, dur: number, ratio: number, snippet: string) => void
  onEnded: () => void
  onError: () => void
  persistCheckpoint: (idx: number, snippet: string, cur: number, total: number, voice: string, rate: number) => void
  lastCheckpointWriteRef: React.MutableRefObject<number>
}

export interface PlaybackDispatchParams {
  sessionId: number
  getSessionId: () => number
  text: string
  idx: number
  currentParas: string[]
  voiceToUse: string
  baseVoice?: string
  initialSeekSec: number
  ttsRate: number
  fetchNeuralAudio: (text: string, voice: string) => Promise<{ blobUrl: string; durationMs: number; cacheHit: boolean }>
  prefetchParagraph: (text: string, voice: string) => void
  getOrCreateAudio: () => HTMLAudioElement
  setDurationSec: (dur: number) => void
  setCurrentTimeSec: (cur: number) => void
  setParaProgress: (prog: number) => void
  setActiveSentenceSnippet: (snip: string) => void
  setLastCacheStatus: (status: 'HIT' | 'MISS' | 'LOCAL') => void
  setTtsLoading: (loading: boolean) => void
  persistCheckpoint: (idx: number, snip: string, cur: number, total: number, voice: string, rate: number) => void
  lastCheckpointWriteRef: React.MutableRefObject<number>
  onNextParagraph: () => void
  onPlaybackError?: () => void
  speakFallback?: (text: string, sessionId: number) => void
  preloadStandbyDeck?: (url: string, rate: number) => void
}

export function bindAudioEventListeners(
  audio: HTMLAudioElement,
  handlers: AudioSessionHandlers
): void {
  const {
    sessionId, getSessionId, text, idx, totalParas, voiceToUse, estDur,
    initialSeekSec, ttsRate, onDurationChange, onTimeUpdate, onEnded, onError,
    persistCheckpoint, lastCheckpointWriteRef,
  } = handlers

  let rafId: number | null = null

  const stopRaf = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const tickHighFreq = () => {
    if (sessionId !== getSessionId()) {
      stopRaf()
      return
    }
    if (!audio.paused && !audio.ended && Number.isFinite(audio.duration) && audio.duration > 0) {
      const cur = audio.currentTime || 0
      const dur = audio.duration
      const ratio = Math.min(1, Math.max(0, cur / dur))
      const { activeSentence, sentenceProgress } = computeSentenceProgress(text, ratio)
      const store = useTtsStore.getState()
      if (store.activeSentence !== activeSentence) {
        store.setActiveSentence(activeSentence)
      }
      store.setSentenceProgress(sentenceProgress)
      rafId = requestAnimationFrame(tickHighFreq)
    } else {
      stopRaf()
    }
  }

  audio.onplay = () => {
    if (sessionId !== getSessionId()) return
    stopRaf()
    rafId = requestAnimationFrame(tickHighFreq)
  }

  audio.onpause = () => {
    stopRaf()
  }

  audio.onloadedmetadata = () => {
    if (sessionId === getSessionId() && Number.isFinite(audio.duration) && audio.duration > 0) {
      onDurationChange(audio.duration)
      if (initialSeekSec > 0.5 && initialSeekSec < audio.duration - 0.5) {
        audio.currentTime = initialSeekSec
      }
      stopRaf()
      rafId = requestAnimationFrame(tickHighFreq)
    }
  }

  audio.ontimeupdate = () => {
    if (sessionId !== getSessionId()) return
    const cur = audio.currentTime || 0
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : estDur
    const ratio = Math.min(1, Math.max(0, cur / Math.max(0.1, dur)))
    const curSnip = computeActiveSentence(text, ratio)
    onTimeUpdate(cur, dur, ratio, curSnip)

    const now = Date.now()
    if (now - lastCheckpointWriteRef.current >= 1500) {
      lastCheckpointWriteRef.current = now
      persistCheckpoint(idx, curSnip, cur, totalParas, voiceToUse, ttsRate)
    }

    if (!rafId && !audio.paused && !audio.ended) {
      rafId = requestAnimationFrame(tickHighFreq)
    }
  }

  audio.onended = () => {
    stopRaf()
    if (sessionId === getSessionId()) onEnded()
  }

  audio.onerror = () => {
    stopRaf()
    if (sessionId === getSessionId()) onError()
  }
}

export async function dispatchAudioPlayback(p: PlaybackDispatchParams): Promise<void> {
  try {
    // 1. Sliding prefetch and standby deck warm-up (use exact same voice resolution as speakParagraphAtIndex)
    let prefetchCount = 0
    let scanIdx = p.idx + 1
    const baseVoice = p.baseVoice || p.voiceToUse
    const isDualRole = baseVoice.startsWith('drama-')
    while (scanIdx < p.currentParas.length && prefetchCount < 4) {
      if (!isNonSpokenMarkerParagraph(p.currentParas[scanIdx])) {
        const aheadText = p.currentParas[scanIdx]?.trim()
        if (aheadText) {
          const aheadVoice = isDualRole ? resolveSentenceVoice(aheadText, baseVoice, true) : baseVoice
          p.prefetchParagraph(aheadText, aheadVoice)
          if (prefetchCount === 0 && p.preloadStandbyDeck) {
            p.fetchNeuralAudio(aheadText, aheadVoice)
              .then((entry) => {
                if (p.sessionId === p.getSessionId()) p.preloadStandbyDeck?.(entry.blobUrl, p.ttsRate)
              })
              .catch(() => {})
          }
          prefetchCount += 1
        }
      }
      scanIdx += 1
    }

    let audioEntry: { blobUrl: string; durationMs: number; cacheHit: boolean }
    try {
      audioEntry = await p.fetchNeuralAudio(p.text, p.voiceToUse)
    } catch {
      if (p.sessionId !== p.getSessionId()) return
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (p.sessionId !== p.getSessionId()) return
      audioEntry = await p.fetchNeuralAudio(p.text, p.voiceToUse)
    }
    if (p.sessionId !== p.getSessionId()) return

    p.setLastCacheStatus(audioEntry.cacheHit ? 'HIT' : 'MISS')
    p.setTtsLoading(false)

    const audio = p.getOrCreateAudio()
    audio.preload = 'auto'
    if (audio.src !== audioEntry.blobUrl) {
      audio.src = audioEntry.blobUrl
    }
    audio.playbackRate = p.ttsRate
    audio.setAttribute('playsinline', 'true')
    if ('preservesPitch' in audio) (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true

    const estDur = Math.max(0.5, audioEntry.durationMs / 1000)
    p.setDurationSec(estDur)

    bindAudioEventListeners(audio, {
      sessionId: p.sessionId, getSessionId: p.getSessionId, text: p.text, idx: p.idx,
      totalParas: p.currentParas.length, voiceToUse: p.voiceToUse, estDur,
      initialSeekSec: p.initialSeekSec, ttsRate: p.ttsRate,
      onDurationChange: p.setDurationSec,
      onTimeUpdate: (cur, dur, ratio, snip) => {
        p.setCurrentTimeSec(cur); p.setDurationSec(dur)
        p.setParaProgress(Math.round(ratio * 100)); p.setActiveSentenceSnippet(snip)
      },
      onEnded: () => {
        if (p.sessionId !== p.getSessionId()) return
        p.setParaProgress(100)
        p.onNextParagraph()
      },
      onError: () => {
        if (p.sessionId !== p.getSessionId()) return
        p.setTtsLoading(false)
        p.setLastCacheStatus('LOCAL')
        if (p.speakFallback) {
          p.speakFallback(p.text, p.sessionId)
        } else {
          p.onPlaybackError?.()
        }
      },
      persistCheckpoint: p.persistCheckpoint, lastCheckpointWriteRef: p.lastCheckpointWriteRef,
    })

    if (p.sessionId !== p.getSessionId()) {
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch {}
      return
    }

    if (audio.paused) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        try {
          await playPromise
        } catch (e: unknown) {
          if (p.sessionId !== p.getSessionId()) return
          throw e
        }
      }
    }

    if (p.sessionId !== p.getSessionId()) {
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch {}
      return
    }
  } catch (err: unknown) {
    if (p.sessionId !== p.getSessionId()) return
    const errorObj = err as { name?: string; message?: string } | null
    if (errorObj?.name === 'AbortError' || errorObj?.message?.includes?.('interrupted')) {
      return
    }
    if (errorObj?.name === 'NotAllowedError') {
      p.setTtsLoading(false)
      p.onPlaybackError?.()
      return
    }
    p.setTtsLoading(false)
    p.setLastCacheStatus('LOCAL')
    if (p.speakFallback) {
      p.speakFallback(p.text, p.sessionId)
    } else {
      p.onPlaybackError?.()
    }
  }
}
