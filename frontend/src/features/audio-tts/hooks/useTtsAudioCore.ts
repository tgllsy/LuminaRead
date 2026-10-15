import { useRef, useCallback } from 'react'
import type { SleepTimerMode } from '../types'
import { isNonSpokenMarkerParagraph, computeActiveSentence } from '../helpers'
import { resolveSentenceVoice } from '../helpers/dialogueSpeaker'
import { dispatchAudioPlayback } from '../helpers/ttsAudioSession'
import type { useTtsPlaybackState } from './useTtsPlaybackState'
import { useTtsStop } from './useTtsStop'
import { useTtsStore } from '../../../stores/ttsStore'
import { claimGlobalTtsSession } from '../helpers/globalTtsCoordinator'
import { useWebSpeechFallback } from './useWebSpeechFallback'

interface AudioCoreOptions {
  bookId: string
  state: ReturnType<typeof useTtsPlaybackState>
  paragraphsRef: React.MutableRefObject<string[]>
  selectedVoiceRef: React.MutableRefObject<string>
  ttsRateRef: React.MutableRefObject<number>
  sleepModeRef: React.MutableRefObject<SleepTimerMode>
  lastCheckpointWriteRef: React.MutableRefObject<number>
  autoAdvanceChapterRef: React.MutableRefObject<boolean>
  hasNextChapter: boolean
  handleSelectSleepMode: (m: SleepTimerMode) => void
  onActiveParagraphChange: (idx: number | null) => void
  onNextChapter: () => void
  abortActiveAudioElements: () => void
  abortInflightRequests?: () => void
  getOrCreateAudioElement: () => HTMLAudioElement
  preloadStandbyDeck?: (url: string, rate: number) => void
  swapAndPlayDeck?: () => HTMLAudioElement
  fetchParagraphNeuralAudio: (text: string, voice: string) => Promise<{ blobUrl: string; durationMs: number; cacheHit: boolean }>
  prefetchParagraph: (text: string, voice: string) => void
  hasCachedAudio?: (text: string, voice: string) => boolean
  persistListeningCheckpoint: (
    idx: number,
    snippet: string,
    timeSec: number,
    totalParas: number,
    voice: string,
    rate: number
  ) => void
  syncServerProgress: (idx: number, totalParas: number) => void
  setLastCacheStatus: (s: 'HIT' | 'MISS' | 'LOCAL' | null) => void
}

function initParagraphState(
  state: ReturnType<typeof useTtsPlaybackState>,
  idx: number,
  snippet: string,
  initialSeekSec: number,
  isCached: boolean,
  onActiveParagraphChange: (idx: number | null) => void
) {
  state.setTtsPlaying(true)
  state.setTtsPaused(false)
  state.setTtsLoading(!isCached)
  state.setParaProgress(0)
  state.setCurrentTimeSec(initialSeekSec > 0 ? initialSeekSec : 0)
  state.setDurationSec(0)
  state.setActiveSentenceSnippet(snippet)
  useTtsStore.getState().setActiveSentence(snippet)
  onActiveParagraphChange(idx)
}

function handleEndOfChapterParagraphs(
  curOpts: AudioCoreOptions,
  startIdx: number,
  hasSpokenInChapter: boolean
): void {
  if (curOpts.sleepModeRef.current === 'chapter_end') {
    curOpts.handleSelectSleepMode('off')
  } else if (startIdx > 0 && hasSpokenInChapter && curOpts.hasNextChapter) {
    curOpts.autoAdvanceChapterRef.current = true
    curOpts.onNextChapter()
    return
  }
  curOpts.state.setTtsPlaying(false)
  curOpts.state.setTtsPaused(false)
  curOpts.state.setTtsLoading(false)
  curOpts.onActiveParagraphChange(null)
}

export function useTtsAudioCore(opts: AudioCoreOptions) {
  const playbackSessionRef = useRef(0)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const { speakParagraphViaWebSpeechFallback, cancelFallback } = useWebSpeechFallback(
    opts.ttsRateRef.current,
    opts.selectedVoiceRef.current
  )

  const stopTTS = useTtsStop({
    state: opts.state,
    playbackSessionRef,
    autoAdvanceChapterRef: opts.autoAdvanceChapterRef,
    abortActiveAudioElements: () => {
      cancelFallback()
      opts.abortActiveAudioElements()
    },
    abortInflightRequests: opts.abortInflightRequests,
  })

  const speakParagraphAtIndex = useCallback(
    async (startIdx: number, overrideVoice?: string, initialSeekSec = 0, isAutoAdvance = false) => {
      const curOpts = optsRef.current
      const currentParas = curOpts.paragraphsRef.current
      if (currentParas.length === 0) return

      const sessionId = ++playbackSessionRef.current
      if (!isAutoAdvance) {
        curOpts.abortActiveAudioElements()
        cancelFallback()
      }
      let idx = Math.max(0, startIdx)
      while (idx < currentParas.length && isNonSpokenMarkerParagraph(currentParas[idx])) idx += 1

      if (idx >= currentParas.length) {
        const hasSpokenInChapter = currentParas.some((p) => !isNonSpokenMarkerParagraph(p))
        handleEndOfChapterParagraphs(curOpts, startIdx, hasSpokenInChapter)
        return
      }

      const text = currentParas[idx].trim()
      const baseVoice = overrideVoice || curOpts.selectedVoiceRef.current
      const isDualRole = baseVoice.startsWith('drama-')
      const voiceToUse = isDualRole ? resolveSentenceVoice(text, baseVoice, true) : baseVoice
      const initSnippet = computeActiveSentence(text, 0)
      const isCached = Boolean(curOpts.hasCachedAudio?.(text, voiceToUse))

      initParagraphState(curOpts.state, idx, initSnippet, initialSeekSec, isCached, curOpts.onActiveParagraphChange)
      curOpts.persistListeningCheckpoint(
        idx,
        initSnippet,
        initialSeekSec > 0 ? initialSeekSec : 0,
        currentParas.length,
        voiceToUse,
        curOpts.ttsRateRef.current
      )
      curOpts.lastCheckpointWriteRef.current = Date.now()
      curOpts.syncServerProgress(idx, currentParas.length)
      claimGlobalTtsSession(curOpts.bookId, stopTTS, curOpts.getOrCreateAudioElement())

      await dispatchAudioPlayback({
        sessionId,
        getSessionId: () => playbackSessionRef.current,
        text,
        idx,
        currentParas,
        voiceToUse,
        baseVoice,
        initialSeekSec,
        ttsRate: curOpts.ttsRateRef.current,
        fetchNeuralAudio: curOpts.fetchParagraphNeuralAudio,
        prefetchParagraph: curOpts.prefetchParagraph,
        getOrCreateAudio: curOpts.getOrCreateAudioElement,
        setDurationSec: (dur) => optsRef.current.state.setDurationSec(dur),
        setCurrentTimeSec: (cur) => optsRef.current.state.setCurrentTimeSec(cur),
        setParaProgress: (p) => optsRef.current.state.setParaProgress(p),
        setActiveSentenceSnippet: (s) => {
          optsRef.current.state.setActiveSentenceSnippet(s)
          useTtsStore.getState().setActiveSentence(s)
        },
        setLastCacheStatus: (st) => optsRef.current.setLastCacheStatus(st),
        setTtsLoading: (l) => optsRef.current.state.setTtsLoading(l),
        persistCheckpoint: curOpts.persistListeningCheckpoint,
        lastCheckpointWriteRef: curOpts.lastCheckpointWriteRef,
        preloadStandbyDeck: curOpts.preloadStandbyDeck,
        onNextParagraph: () => {
          if (curOpts.swapAndPlayDeck) curOpts.swapAndPlayDeck()
          speakParagraphAtIndex(idx + 1, undefined, 0, true)
        },
        onPlaybackError: () => {
          optsRef.current.state.setTtsPlaying(false)
          optsRef.current.state.setTtsPaused(false)
          optsRef.current.state.setTtsLoading(false)
          optsRef.current.onActiveParagraphChange(null)
        },
        speakFallback: (fallbackText, sessId) => {
          optsRef.current.state.setTtsLoading(false)
          speakParagraphViaWebSpeechFallback(
            fallbackText,
            sessId,
            () => playbackSessionRef.current,
            (snip, pct) => {
              optsRef.current.state.setActiveSentenceSnippet(snip)
              useTtsStore.getState().setActiveSentence(snip)
              optsRef.current.state.setParaProgress(pct)
            },
            () => {
              if (sessId === playbackSessionRef.current) {
                speakParagraphAtIndex(idx + 1, undefined, 0, true)
              }
            }
          )
        },
      })
    },
    [cancelFallback, speakParagraphViaWebSpeechFallback]
  )

  return { stopTTS, speakParagraphAtIndex }
}
