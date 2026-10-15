import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { AmbientAndTTSBarProps, ActiveTtsDrawer } from '../types'
import { getThemeClasses, isNonSpokenMarkerParagraph } from '../helpers'
import { computeChapterTimeStats, seekChapterTarget, stepChapterSeconds } from '../helpers/chapterTimeHelper'
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
} from '../hooks'
import { useTtsAudioControls } from '../hooks/useTtsAudioControls'
import { TtsHeader } from './TtsHeader'
import { TtsCoverStage } from './TtsCoverStage'
import { TtsPlayerBar } from './TtsPlayerBar'
import { TtsDrawersLayer } from './TtsDrawersLayer'

function useAmbientAndTtsController(props: AmbientAndTTSBarProps) {
  const {
    isOpen, onClose, onAudioStatusChange, onCheckpointSaved, onSelectChapter,
    resumeRequestNonce = 0, togglePlayPauseNonce = 0, playParagraphRequest = null,
    bookId = '', bookTitle = '阅境在读书籍', bookAuthor = '阅境伴读', chapterTitle = '',
    coverUrl = '', coverColor = '#2b593f', paragraphs, chapterIndex = 0, hasNextChapter = true,
    activeParagraphIndex, onActiveParagraphChange, onNextChapter, getVisibleParagraphIndex,
  } = props
  const [activeDrawer, setActiveDrawer] = useState<ActiveTtsDrawer>('none')
  const vm = useVoicesManager(isOpen)
  const amb = useAmbientMixer('off', 0.35)
  const pb = useAudioPlayback(vm.ttsRate)
  const syn = useTtsSynthesis()
  const cp = useTtsCheckpoint({ bookId, bookTitle, bookAuthor, coverUrl, coverColor, chapterIndex, chapterTitle, isOpen, onCheckpointSaved })

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
    if (listeningCapsuleDismissed && amb.ambientPreset !== 'off') { amb.stopAmbientAudio(); amb.setAmbientPreset('off') }
  }, [listeningCapsuleDismissed, amb.ambientPreset, amb.stopAmbientAudio, amb.setAmbientPreset])

  useEffect(() => {
    return () => {
      stopTtsRef.current()
      amb.stopAmbientAudio()
      onActiveParagraphChange(null)
    }
  }, [amb.stopAmbientAudio, onActiveParagraphChange])

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

function useTtsMediaSessionIntegration({
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

export const AmbientAndTTSBar: React.FC<AmbientAndTTSBarProps> = (props) => {
  const {
    isOpen, onClose, theme = 'parchment', bookId = '', bookTitle = '阅境在读书籍',
    bookAuthor = '阅境伴读', chapterTitle = '', coverUrl = '', coverColor = '#2b593f',
    paragraphs, chapterIndex = 0, activeParagraphIndex, onActiveParagraphChange,
    getVisibleParagraphIndex, onOpenToc,
  } = props
  const { activeDrawer, setActiveDrawer, vm, amb, pb, syn, cp, slp, ctrl, activeVoiceMeta } = useAmbientAndTtsController(props)

  const visibleParaIdx = getVisibleParagraphIndex ? getVisibleParagraphIndex() : 0
  const currentParaIdx = activeParagraphIndex !== null ? activeParagraphIndex : visibleParaIdx

  const chapterTimeStats = useMemo(
    () =>
      computeChapterTimeStats(
        paragraphs,
        currentParaIdx,
        ctrl.currentTimeSec,
        ctrl.durationSec,
        vm.ttsRate
      ),
    [paragraphs, currentParaIdx, ctrl.currentTimeSec, ctrl.durationSec, vm.ttsRate]
  )

  const handleSeekInChapter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)))
    const target = seekChapterTarget(paragraphs, ratio, vm.ttsRate)
    pb.getOrCreateAudioElement()
    ctrl.speakParagraphAtIndex(target.targetParagraphIndex, undefined, target.seekSecInParagraph)
  }, [paragraphs, vm.ttsRate, pb, ctrl])

  const handleSeekChapterBySeconds = useCallback((deltaSec: number) => {
    const target = stepChapterSeconds(
      paragraphs,
      currentParaIdx,
      ctrl.currentTimeSec,
      ctrl.durationSec,
      deltaSec,
      vm.ttsRate
    )
    pb.getOrCreateAudioElement()
    ctrl.speakParagraphAtIndex(target.targetParagraphIndex, undefined, target.seekSecInParagraph)
  }, [paragraphs, currentParaIdx, ctrl, vm.ttsRate, pb])

  const handleLocateOriginalText = useCallback(() => {
    if (props.onSelectChapter) {
      props.onSelectChapter(chapterIndex, currentParaIdx)
    }
    onClose()
  }, [props.onSelectChapter, chapterIndex, currentParaIdx, onClose])

  if (!isOpen) return null
  const themeCls = getThemeClasses(theme)
  const currentSpokenText = ctrl.activeSentenceSnippet || paragraphs[currentParaIdx] || paragraphs[0] || chapterTitle || bookTitle

  return (
    <div data-no-hud-toggle="true" onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4 select-none animate-in fade-in duration-150">
      <div onClick={(e) => e.stopPropagation()} className={`relative w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-md sm:rounded-3xl sm:border flex flex-col justify-between overflow-hidden transition-colors ${themeCls.surfaceCls}`}>
        <TtsHeader
          onClose={onClose} onExitTts={() => { ctrl.stopTTS(); amb.stopAmbientAudio(); amb.setAmbientPreset('off'); onActiveParagraphChange(null); onClose() }}
          onToggleParagraphDrawer={() => setActiveDrawer((d) => (d === 'paragraphs' ? 'none' : 'paragraphs'))}
          onAlignCurrent={() => { pb.getOrCreateAudioElement(); ctrl.speakParagraphAtIndex(visibleParaIdx) }}
          isOutOfSync={activeParagraphIndex !== null && Math.abs(activeParagraphIndex - visibleParaIdx) >= 1}
          currentParaIdx={currentParaIdx} totalParagraphs={paragraphs.length} lastCacheStatus={syn.lastCacheStatus}
          serverCacheClips={vm.serverCacheClips} accentBadgeCls={themeCls.accentBadgeCls} accentActivePillCls={themeCls.accentActivePillCls}
        />
        <TtsCoverStage
          bookTitle={bookTitle} bookAuthor={bookAuthor} chapterTitle={chapterTitle} coverUrl={coverUrl} coverColor={coverColor}
          currentSpokenText={currentSpokenText} savedCheckpoint={cp.savedCheckpoint} bookId={bookId} chapterIndex={chapterIndex}
          activeParagraphIndex={activeParagraphIndex} ttsPlaying={ctrl.ttsPlaying} ttsPaused={ctrl.ttsPaused}
          mutedTextCls={themeCls.mutedTextCls} accentBadgeCls={themeCls.accentBadgeCls}
          onToggleParagraphDrawer={() => setActiveDrawer((d) => (d === 'paragraphs' ? 'none' : 'paragraphs'))}
          onResumeCheckpoint={ctrl.handleResumeCheckpoint}
          onLocateOriginalText={handleLocateOriginalText}
        />
        <TtsPlayerBar
          activeDrawer={activeDrawer} onToggleDrawer={(d) => setActiveDrawer((prev) => (prev === d ? 'none' : d))}
          sleepMode={slp.sleepMode} sleepRemainingSec={slp.sleepRemainingSec} activeVoiceShortName={activeVoiceMeta?.shortName || ''}
          ttsRate={vm.ttsRate} ambientPreset={amb.ambientPreset}
          chapterProgressPct={chapterTimeStats.chapterProgressPct}
          displayElapsed={chapterTimeStats.displayElapsed}
          displayTotal={chapterTimeStats.displayTotal}
          ttsPlaying={ctrl.ttsPlaying} ttsPaused={ctrl.ttsPaused} ttsLoading={ctrl.ttsLoading} canStepPrev={ctrl.ttsPlaying || ctrl.ttsPaused || currentParaIdx > 0}
          onSeekInChapter={handleSeekInChapter}
          onSeekBySeconds={handleSeekChapterBySeconds}
          onTogglePlayPause={ctrl.togglePlayPause} onStepPrev={ctrl.stepPrevParagraph} onStepNext={ctrl.stepNextParagraph} onClose={onClose} onOpenToc={onOpenToc}
          onLocateOriginalText={handleLocateOriginalText}
          isDark={themeCls.isDark} mutedTextCls={themeCls.mutedTextCls} cardBgCls={themeCls.cardBgCls} accentBtnCls={themeCls.accentBtnCls} activeTextAccentCls={themeCls.activeTextAccentCls}
        />
        <TtsDrawersLayer
          activeDrawer={activeDrawer} onCloseDrawer={() => setActiveDrawer('none')} themeCls={themeCls}
          paragraphs={paragraphs} currentParaIdx={currentParaIdx} ttsPlaying={ctrl.ttsPlaying} ttsPaused={ctrl.ttsPaused}
          activeParagraphIndex={activeParagraphIndex} serverCacheClips={vm.serverCacheClips} voices={vm.voices}
          selectedVoice={vm.selectedVoice} voiceCategory={vm.voiceCategory} ttsRate={vm.ttsRate} ambientPreset={amb.ambientPreset}
          ambientVolume={amb.ambientVolume} sleepMode={slp.sleepMode}
          onSelectParagraph={(idx) => { pb.getOrCreateAudioElement(); ctrl.speakParagraphAtIndex(idx); setActiveDrawer('none') }}
          onSelectVoice={(vId) => { vm.setSelectedVoice(vId); vm.selectedVoiceRef.current = vId; if (ctrl.ttsPlaying || ctrl.ttsPaused) ctrl.speakParagraphAtIndex(activeParagraphIndex ?? 0, vId); setActiveDrawer('none') }}
          onSelectVoiceCategory={vm.setVoiceCategory} onSelectRate={(r) => { vm.setTtsRate(r); setActiveDrawer('none') }}
          onSelectPreset={(p) => { amb.setAmbientPreset(p); amb.startAmbientAudio(p, amb.ambientVolume) }} onVolumeChange={amb.setAmbientVolume}
          onSelectSleepMode={(m) => { slp.handleSelectSleepMode(m); setActiveDrawer('none') }}
        />
      </div>
    </div>
  )
}
