import React from 'react'
import { Radio, Gauge, Headphones, Timer, BookOpen } from 'lucide-react'
import type { ActiveTtsDrawer, NeuralVoiceOption, AmbientPreset, SleepTimerMode, VoiceCategory } from '../types'
import { TtsDrawerModal } from './TtsDrawerModal'
import { AmbientMixerModal } from './AmbientMixerModal'
import { VoicePickerModal } from './VoicePickerModal'
import { SpeedPickerModal } from './SpeedPickerModal'
import { TimerPickerModal } from './TimerPickerModal'
import { ParagraphPickerModal } from './ParagraphPickerModal'

interface TtsDrawersLayerProps {
  activeDrawer: ActiveTtsDrawer
  onCloseDrawer: () => void
  themeCls: {
    surfaceCls: string
    pillIdleCls: string
    accentActivePillCls: string
    mutedTextCls: string
  }
  paragraphs: string[]
  currentParaIdx: number
  ttsPlaying: boolean
  ttsPaused: boolean
  activeParagraphIndex: number | null
  serverCacheClips: number
  voices: NeuralVoiceOption[]
  selectedVoice: string
  voiceCategory: VoiceCategory
  ttsRate: number
  ambientPreset: AmbientPreset
  ambientVolume: number
  ambientEnabled?: boolean
  onToggleAmbientEnabled?: () => void
  sleepMode: SleepTimerMode
  onSelectParagraph: (idx: number) => void
  onSelectVoice: (vId: string) => void
  onSelectVoiceCategory: (cat: VoiceCategory) => void
  onSelectRate: (r: number) => void
  onSelectPreset: (p: AmbientPreset) => void
  onVolumeChange: (vol: number) => void
  onSelectSleepMode: (m: SleepTimerMode) => void
}

export const TtsDrawersLayer: React.FC<TtsDrawersLayerProps> = ({
  activeDrawer,
  onCloseDrawer,
  themeCls,
  paragraphs,
  currentParaIdx,
  ttsPlaying,
  serverCacheClips,
  voices,
  selectedVoice,
  voiceCategory,
  ttsRate,
  ambientPreset,
  ambientVolume,
  ambientEnabled,
  onToggleAmbientEnabled,
  sleepMode,
  onSelectParagraph,
  onSelectVoice,
  onSelectVoiceCategory,
  onSelectRate,
  onSelectPreset,
  onVolumeChange,
  onSelectSleepMode,
}) => {
  return (
    <>
      <TtsDrawerModal
        isOpen={activeDrawer === 'paragraphs'}
        title={
          <>
            <BookOpen className="w-4 h-4" />
            <span>本章段落 · 点击即读</span>
            <span className={`text-[11px] font-normal ml-1 ${themeCls.mutedTextCls}`}>
              共 {paragraphs.length} 段
            </span>
          </>
        }
        onClose={onCloseDrawer}
        surfaceCls={themeCls.surfaceCls}
        pillIdleCls={themeCls.pillIdleCls}
      >
        <ParagraphPickerModal
          paragraphs={paragraphs}
          currentParaIdx={currentParaIdx}
          ttsPlaying={ttsPlaying}
          onSelectParagraph={onSelectParagraph}
          pillIdleCls={themeCls.pillIdleCls}
          accentActivePillCls={themeCls.accentActivePillCls}
        />
      </TtsDrawerModal>

      <TtsDrawerModal
        isOpen={activeDrawer === 'voices'}
        title={
          <>
            <Radio className="w-4 h-4" />
            <span>选择 AI 伴读音色</span>
            <span className={`text-[11px] font-normal ml-1 ${themeCls.mutedTextCls}`}>
              已缓存 {serverCacheClips} 段
            </span>
          </>
        }
        onClose={onCloseDrawer}
        surfaceCls={themeCls.surfaceCls}
        pillIdleCls={themeCls.pillIdleCls}
      >
        <VoicePickerModal
          voices={voices}
          selectedVoice={selectedVoice}
          voiceCategory={voiceCategory}
          onSelectCategory={onSelectVoiceCategory}
          onSelectVoice={onSelectVoice}
          pillIdleCls={themeCls.pillIdleCls}
          accentActivePillCls={themeCls.accentActivePillCls}
          mutedTextCls={themeCls.mutedTextCls}
        />
      </TtsDrawerModal>

      <TtsDrawerModal
        isOpen={activeDrawer === 'speed'}
        title={
          <>
            <Gauge className="w-4 h-4" />
            <span>调节朗读倍速</span>
          </>
        }
        onClose={onCloseDrawer}
        surfaceCls={themeCls.surfaceCls}
        pillIdleCls={themeCls.pillIdleCls}
      >
        <SpeedPickerModal
          ttsRate={ttsRate}
          onSelectRate={onSelectRate}
          pillIdleCls={themeCls.pillIdleCls}
          accentActivePillCls={themeCls.accentActivePillCls}
        />
      </TtsDrawerModal>

      <TtsDrawerModal
        isOpen={activeDrawer === 'ambient'}
        title={
          <>
            <Headphones className="w-4 h-4" />
            <span>书房环境音混音</span>
          </>
        }
        onClose={onCloseDrawer}
        surfaceCls={themeCls.surfaceCls}
        pillIdleCls={themeCls.pillIdleCls}
      >
        <AmbientMixerModal
          ambientEnabled={ambientEnabled}
          onToggleEnabled={onToggleAmbientEnabled}
          ambientPreset={ambientPreset}
          ambientVolume={ambientVolume}
          onSelectPreset={onSelectPreset}
          onVolumeChange={onVolumeChange}
          pillIdleCls={themeCls.pillIdleCls}
          accentActivePillCls={themeCls.accentActivePillCls}
          mutedTextCls={themeCls.mutedTextCls}
        />
      </TtsDrawerModal>

      <TtsDrawerModal
        isOpen={activeDrawer === 'sleep'}
        title={
          <>
            <Timer className="w-4 h-4" />
            <span>睡眠定时关闭</span>
          </>
        }
        onClose={onCloseDrawer}
        surfaceCls={themeCls.surfaceCls}
        pillIdleCls={themeCls.pillIdleCls}
      >
        <TimerPickerModal
          sleepMode={sleepMode}
          onSelectSleepMode={onSelectSleepMode}
          pillIdleCls={themeCls.pillIdleCls}
          accentActivePillCls={themeCls.accentActivePillCls}
        />
      </TtsDrawerModal>
    </>
  )
}
