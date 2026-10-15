import { useRef } from 'react'
import type { SleepTimerMode } from '../types'
import { useTtsPlaybackState } from './useTtsPlaybackState'
import { useTtsNavigation } from './useTtsNavigation'
import { useTtsAudioCore } from './useTtsAudioCore'
import { useTtsToggle } from './useTtsToggle'

interface UseTtsAudioControlsOptions {
  bookId: string
  chapterIndex: number
  chapterTitle: string
  bookTitle: string
  paragraphs: string[]
  hasNextChapter: boolean
  activeParagraphIndex: number | null
  selectedVoiceRef: React.MutableRefObject<string>
  ttsRateRef: React.MutableRefObject<number>
  audioElRef: React.MutableRefObject<HTMLAudioElement | null>
  getOrCreateAudioElement: () => HTMLAudioElement
  deckManagerRef?: React.MutableRefObject<{
    preloadStandby: (url: string, rate: number) => void
    swapAndPlay: () => HTMLAudioElement
  } | null>
  abortActiveAudioElements?: () => void
  abortInflightRequests?: () => void
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
  lastCheckpointWriteRef: React.MutableRefObject<number>
  sleepModeRef: React.MutableRefObject<SleepTimerMode>
  handleSelectSleepMode: (m: SleepTimerMode) => void
  onActiveParagraphChange: (idx: number | null) => void
  onNextChapter: () => void
  onSelectChapter?: (cIdx: number) => void
  getVisibleParagraphIndex?: () => number
  lastCacheStatus: 'HIT' | 'MISS' | 'LOCAL' | null
  setLastCacheStatus: (s: 'HIT' | 'MISS' | 'LOCAL' | null) => void
}

export function useTtsAudioControls(opts: UseTtsAudioControlsOptions) {
  const state = useTtsPlaybackState()
  const autoAdvanceChapterRef = useRef(false)
  const prevChapterIndexRef = useRef(opts.chapterIndex)
  const paragraphsRef = useRef(opts.paragraphs)
  paragraphsRef.current = opts.paragraphs

  const { stopTTS, speakParagraphAtIndex } = useTtsAudioCore({
    bookId: opts.bookId, state, paragraphsRef, selectedVoiceRef: opts.selectedVoiceRef,
    ttsRateRef: opts.ttsRateRef, sleepModeRef: opts.sleepModeRef, lastCheckpointWriteRef: opts.lastCheckpointWriteRef,
    autoAdvanceChapterRef, hasNextChapter: opts.hasNextChapter, handleSelectSleepMode: opts.handleSelectSleepMode,
    onActiveParagraphChange: opts.onActiveParagraphChange, onNextChapter: opts.onNextChapter,
    abortActiveAudioElements: opts.abortActiveAudioElements ?? (() => {}), abortInflightRequests: opts.abortInflightRequests,
    getOrCreateAudioElement: opts.getOrCreateAudioElement,
    preloadStandbyDeck: (url, rate) => opts.deckManagerRef?.current?.preloadStandby(url, rate),
    swapAndPlayDeck: () => opts.deckManagerRef?.current?.swapAndPlay() as HTMLAudioElement,
    fetchParagraphNeuralAudio: opts.fetchParagraphNeuralAudio, prefetchParagraph: opts.prefetchParagraph,
    hasCachedAudio: opts.hasCachedAudio, persistListeningCheckpoint: opts.persistListeningCheckpoint,
    syncServerProgress: opts.syncServerProgress, setLastCacheStatus: opts.setLastCacheStatus,
  })

  const togglePlayPause = useTtsToggle({
    state, audioElRef: opts.audioElRef, selectedVoiceRef: opts.selectedVoiceRef, ttsRateRef: opts.ttsRateRef,
    paragraphsRef, activeParagraphIndex: opts.activeParagraphIndex, getVisibleParagraphIndex: opts.getVisibleParagraphIndex,
    getOrCreateAudioElement: opts.getOrCreateAudioElement, stopTTS, speakParagraphAtIndex,
    onActiveParagraphChange: opts.onActiveParagraphChange, abortInflightRequests: opts.abortInflightRequests,
    persistListeningCheckpoint: opts.persistListeningCheckpoint,
  })

  const nav = useTtsNavigation({
    bookId: opts.bookId, chapterIndex: opts.chapterIndex, activeParagraphIndex: opts.activeParagraphIndex,
    paragraphsRef, speakParagraphAtIndex, onSelectChapter: opts.onSelectChapter, getOrCreateAudioElement: opts.getOrCreateAudioElement,
  })

  return {
    ttsPlaying: state.ttsPlaying, ttsPaused: state.ttsPaused, ttsLoading: state.ttsLoading,
    paraProgress: state.paraProgress, currentTimeSec: state.currentTimeSec, durationSec: state.durationSec,
    activeSentenceSnippet: state.activeSentenceSnippet, setParaProgress: state.setParaProgress,
    setCurrentTimeSec: state.setCurrentTimeSec, setDurationSec: state.setDurationSec,
    stopTTS, speakParagraphAtIndex, togglePlayPause, stepPrevParagraph: nav.stepPrevParagraph,
    stepNextParagraph: nav.stepNextParagraph, handleResumeCheckpoint: nav.handleResumeCheckpoint,
    handlePlayParagraphTarget: nav.handlePlayParagraphTarget, pendingResumeRef: nav.pendingResumeRef,
    prevChapterIndexRef, autoAdvanceChapterRef,
  }
}
