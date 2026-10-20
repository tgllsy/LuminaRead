import React, { useCallback } from 'react'
import type { AmbientAndTTSBarProps } from '../types'
import { stepChapterSeconds } from '../helpers/chapterTimeHelper'
import { useAmbientAndTtsController } from '../hooks/useAmbientAndTtsController'
import { BlackGoldTheaterModal } from './BlackGoldTheaterModal'
import { useTtsStore } from '../../../stores/ttsStore'

export const AmbientAndTTSBar: React.FC<AmbientAndTTSBarProps> = (props) => {
  const {
    isOpen, onClose, bookId = '', bookTitle = '阅境在读书籍',
    bookAuthor = '阅境伴读', chapterTitle = '', coverUrl = '', coverColor = '#2b593f',
    paragraphs, chapterIndex = 0, activeParagraphIndex,
    getVisibleParagraphIndex,
  } = props
  const { vm, pb, slp, ctrl, amb } = useAmbientAndTtsController(props)

  const visibleParaIdx = getVisibleParagraphIndex ? getVisibleParagraphIndex() : 0
  const currentParaIdx = activeParagraphIndex !== null ? activeParagraphIndex : visibleParaIdx

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

  const handleExitListening = useCallback(() => {
    ctrl.stopTTS()
    amb.stopAmbientAudio()
    amb.setAmbientPreset('off')
    props.onActiveParagraphChange(null)
    useTtsStore.getState().setListeningCapsuleDismissed(true)
    useTtsStore.getState().setAudioStatus({
      active: false,
      playing: false,
      paused: false,
      loading: false,
      ambientActive: false,
    })
    onClose()
  }, [ctrl, amb, props.onActiveParagraphChange, onClose])

  if (!isOpen) return null

  return (
    <BlackGoldTheaterModal
      isOpen={isOpen}
      onClose={onClose}
      onExitListening={handleExitListening}
      onLocateOriginalText={handleLocateOriginalText}
      bookId={bookId}
      bookTitle={bookTitle}
      bookAuthor={bookAuthor}
      coverUrl={coverUrl}
      coverColor={coverColor}
      chapterTitle={chapterTitle}
      paragraphs={paragraphs}
      currentParagraphIndex={currentParaIdx}
      onSelectParagraph={(idx) => {
        pb.getOrCreateAudioElement()
        ctrl.speakParagraphAtIndex(idx)
      }}
      isPlaying={ctrl.ttsPlaying}
      isLoading={ctrl.ttsLoading}
      onTogglePlayPause={ctrl.togglePlayPause}
      onStepPrev={ctrl.stepPrevParagraph}
      onStepNext={ctrl.stepNextParagraph}
      onSeekBySeconds={handleSeekChapterBySeconds}
      activeVoice={vm.selectedVoice}
      voices={vm.voices}
      onSelectVoice={(vId) => {
        vm.setSelectedVoice(vId)
        vm.selectedVoiceRef.current = vId
        if (ctrl.ttsPlaying || ctrl.ttsPaused) {
          ctrl.speakParagraphAtIndex(currentParaIdx, vId)
        }
      }}
      speed={vm.ttsRate}
      onSelectSpeed={(r) => vm.setTtsRate(r)}
      sleepRemainingText={slp.sleepRemainingSec > 0 ? `${Math.ceil(slp.sleepRemainingSec / 60)} 分钟` : '已关闭'}
      onSelectSleepTimer={(mins) => slp.handleSelectSleepMode(mins === 0 ? 'off' : (`${mins}m` as any))}
      rainVol={amb.rainVol}
      fireVol={amb.fireVol}
      windVol={amb.windVol}
      onChangeRain={amb.setRainVol}
      onChangeFire={amb.setFireVol}
      onChangeWind={amb.setWindVol}
      ambientPreset={amb.ambientPreset}
      ambientVolume={amb.ambientVolume}
      ambientEnabled={amb.ambientEnabled}
      onToggleAmbientEnabled={amb.toggleAmbientEnabled}
      onSetAmbientEnabled={amb.setAmbientEnabled}
      isAmbientActive={amb.isAmbientActive}
      onSelectAmbientPreset={amb.setAmbientPreset}
      onChangeAmbientVolume={amb.setAmbientVolume}
    />
  )
}

export default AmbientAndTTSBar
