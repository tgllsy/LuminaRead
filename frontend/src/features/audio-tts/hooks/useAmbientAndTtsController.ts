import { useState, useEffect, useCallback, useRef } from 'react'
import type { AmbientAndTTSBarProps, ActiveTtsDrawer } from '../types'
import { isNonSpokenMarkerParagraph } from '../helpers'
import { stepChapterSeconds } from '../helpers/chapterTimeHelper'
import { useTtsStore } from '../../../stores/ttsStore'
import {
  useAmbientMixer,
  useAudioPlayback,
  useVoicesManager,
  useSleepTimer,
  useTtsCheckpoint,
  useMediaSession,
  useTtsSynthesis,
  useAudioKeepAlive,
  useTtsLifecycle,
  useTtsChapterSync,
} from './index'
import { useTtsAudioControls } from './useTtsAudioControls'

export function useTtsMediaSessionIntegration({
  ctrl, pb, amb, vm, bookTitle, bookAuthor, chapterTitle, coverUrl,
  activeParagraphIndex, activeVoiceMeta, paragraphs, onActiveParagraphChange,
}: {
  ctrl: ReturnType<typeof useTtsAudioControls>
  pb: ReturnType<typeof useAudioPlayback>
  amb: ReturnType<typeof useAmbientMixer>
  vm: ReturnType<typeof useVoicesManager>
  bookTitle: string
  bookAuthor: string
  chapterTitle: string
  coverUrl: string
  activeParagraphIndex: number | null
  activeVoiceMeta: any
  paragraphs: string[]
  onActiveParagraphChange: (idx: number | null) => void
}) {
  useAudioKeepAlive(ctrl.ttsPlaying, ctrl.ttsPaused, pb.audioElRef, amb.audioCtxRef)
  useMediaSession({
    ttsPlaying: ctrl.ttsPlaying, ttsPaused: ctrl.ttsPaused, ttsLoading: ctrl.ttsLoading, bookTitle, bookAuthor, chapterTitle,
    coverUrl, activeParagraphIndex, shortName: activeVoiceMeta?.shortName || '', currentTimeSec: ctrl.currentTimeSec,
    durationSec: ctrl.durationSec, ttsRate: vm.ttsRate, onTogglePlayPause: ctrl.togglePlayPause,
    onStop: () => { ctrl.stopTTS(); onActiveParagraphChange(null) }, onPrev: ctrl.stepPrevParagraph, onNext: ctrl.stepNextParagraph,
    onSeekBackward: (offset) => {
      const target = stepChapterSeconds(paragraphs, activeParagraphIndex, ctrl.currentTimeSec, ctrl.durationSec, -offset, vm.ttsRate)
      pb.getOrCreateAudioElement()
      ctrl.speakParagraphAtIndex(target.targetParagraphIndex, undefined, target.seekSecInParagraph)
    },
    onSeekForward: (offset) => {
      const target = stepChapterSeconds(paragraphs, activeParagraphIndex, ctrl.currentTimeSec, ctrl.durationSec, offset, vm.ttsRate)
      pb.getOrCreateAudioElement()
      ctrl.speakParagraphAtIndex(target.targetParagraphIndex, undefined, target.seekSecInParagraph)
    },
  })
}

export function useAmbientAndTtsController(props: AmbientAndTTSBarProps) {
  const {
    isOpen, onClose, onAudioStatusChange, onCheckpointSaved, onSelectChapter,
    resumeRequestNonce = 0, togglePlayPauseNonce = 0, playParagraphRequest = null,
    bookId = '', bookTitle = '阅境在读书籍', bookAuthor = '阅境伴读', chapterTitle = '',
    coverUrl = '', coverColor = '#2b593f', paragraphs, chapterIndex = 0, hasNextChapter = true,
    activeParagraphIndex, onActiveParagraphChange, onNextChapter, getVisibleParagraphIndex,
    totalChapters = 1,
  } = props
  const [activeDrawer, setActiveDrawer] = useState<ActiveTtsDrawer>('none')
  const vm = useVoicesManager(isOpen)
  const amb = useAmbientMixer('off', 0.35)
  const pb = useAudioPlayback(vm.ttsRate)
  const syn = useTtsSynthesis()
  const cp = useTtsCheckpoint({ bookId, bookTitle, bookAuthor, coverUrl, coverColor, chapterIndex, chapterTitle, totalChapters, isOpen, onCheckpointSaved })

  const stopTtsRef = useRef<() => void>(() => {})
  const slp = useSleepTimer(useCallback(() => {
    stopTtsRef.current(); amb.stopAmbientAudio(); amb.setAmbientPreset('off'); onActiveParagraphChange(null)
  }, [amb.stopAmbientAudio, amb.setAmbientPreset, onActiveParagraphChange]))

  const ctrl = useTtsAudioControls({
    bookId, chapterIndex, chapterTitle, bookTitle, paragraphs, hasNextChapter, activeParagraphIndex,
    selectedVoiceRef: vm.selectedVoiceRef, ttsRateRef: vm.ttsRateRef, audioElRef: pb.audioElRef,
    deckManagerRef: pb.deckManagerRef, getOrCreateAudioElement: pb.getOrCreateAudioElement,
    abortActiveAudioElements: pb.abortActiveAudioElements, abortInflightRequests: syn.abortInflightRequests,
    fetchParagraphNeuralAudio: syn.fetchParagraphNeuralAudio, prefetchParagraph: syn.prefetchParagraph,
    hasCachedAudio: syn.hasCachedAudio, persistListeningCheckpoint: cp.persistListeningCheckpoint,
    syncServerProgress: cp.syncServerProgress, lastCheckpointWriteRef: cp.lastCheckpointWriteRef,
    sleepModeRef: slp.sleepModeRef, handleSelectSleepMode: slp.handleSelectSleepMode,
    onActiveParagraphChange, onNextChapter, onSelectChapter, getVisibleParagraphIndex,
    lastCacheStatus: syn.lastCacheStatus, setLastCacheStatus: syn.setLastCacheStatus,
  })
  stopTtsRef.current = ctrl.stopTTS

  const listeningCapsuleDismissed = useTtsStore((s) => s.listeningCapsuleDismissed)
  const handleStopTtsAndClear = useCallback(() => {
    ctrl.stopTTS(); amb.stopAmbientAudio(); amb.setAmbientPreset('off'); onActiveParagraphChange(null)
  }, [ctrl.stopTTS, amb.stopAmbientAudio, amb.setAmbientPreset, onActiveParagraphChange])

  useEffect(() => {
    if (listeningCapsuleDismissed) {
      handleStopTtsAndClear()
    }
  }, [listeningCapsuleDismissed, handleStopTtsAndClear])

  const stopAmbientRef = useRef(amb.stopAmbientAudio)
  stopAmbientRef.current = amb.stopAmbientAudio
  const onActiveParaChangeRef = useRef(onActiveParagraphChange)
  onActiveParaChangeRef.current = onActiveParagraphChange

  useEffect(() => {
    return () => {
      stopTtsRef.current()
      stopAmbientRef.current()
      onActiveParaChangeRef.current(null)
    }
  }, [])

  // Viewport pre-warming to guarantee instant playback on click
  useEffect(() => {
    if (isOpen && paragraphs.length > 0) {
      const start = activeParagraphIndex !== null ? activeParagraphIndex : (getVisibleParagraphIndex ? getVisibleParagraphIndex() : 0)
      for (let i = start; i < Math.min(paragraphs.length, start + 3); i++) {
        const txt = paragraphs[i]?.trim()
        if (txt && !isNonSpokenMarkerParagraph(txt)) {
          syn.prefetchParagraph(txt, vm.selectedVoice)
        }
      }
    }
  }, [isOpen, chapterIndex, paragraphs, activeParagraphIndex, vm.selectedVoice, syn.prefetchParagraph, getVisibleParagraphIndex])

  useTtsLifecycle({
    ttsPlaying: ctrl.ttsPlaying, ttsPaused: ctrl.ttsPaused, ttsLoading: ctrl.ttsLoading, ambientPreset: amb.ambientPreset,
    bookId, bookTitle, chapterIndex, chapterTitle, activeParagraphIndex, totalParagraphs: paragraphs.length,
    activeSentenceSnippet: ctrl.activeSentenceSnippet, resumeRequestNonce, togglePlayPauseNonce, playParagraphRequest,
    paragraphsLength: paragraphs.length, onAudioStatusChange, onResumeCheckpoint: ctrl.handleResumeCheckpoint,
    onTogglePlayPause: ctrl.togglePlayPause, onPlayParagraph: ctrl.handlePlayParagraphTarget, onStop: handleStopTtsAndClear,
  })
  useTtsChapterSync({
    bookId, chapterIndex, paragraphs, isOpen, activeDrawer, setActiveDrawer, onClose,
    speakParagraphAtIndex: ctrl.speakParagraphAtIndex, stopTTS: ctrl.stopTTS, onActiveParagraphChange,
    ttsPlaying: ctrl.ttsPlaying, ttsPaused: ctrl.ttsPaused, pendingResumeRef: ctrl.pendingResumeRef,
    prevChapterIndexRef: ctrl.prevChapterIndexRef, autoAdvanceChapterRef: ctrl.autoAdvanceChapterRef,
  })
  const activeVoiceMeta = vm.voices.find((v) => v.id === vm.selectedVoice) || vm.voices[0]
  useTtsMediaSessionIntegration({
    ctrl, pb, amb, vm, bookTitle, bookAuthor, chapterTitle, coverUrl,
    activeParagraphIndex, activeVoiceMeta, paragraphs, onActiveParagraphChange,
  })
  return { activeDrawer, setActiveDrawer, vm, amb, pb, syn, cp, slp, ctrl, activeVoiceMeta }
}
