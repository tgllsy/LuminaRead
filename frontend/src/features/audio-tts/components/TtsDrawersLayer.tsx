import React, { Suspense } from 'react'
import { Radio, Gauge, Headphones, Timer, BookOpen } from 'lucide-react'
import type { ActiveTtsDrawer, NeuralVoiceOption, AmbientPreset, SleepTimerMode, VoiceCategory } from '../types'
import { TtsDrawerModal } from './TtsDrawerModal'

const AmbientMixerModal = React.lazy(() =>
  import('./AmbientMixerModal').then((m) => ({ default: m.AmbientMixerModal }))
)
const VoicePickerModal = React.lazy(() =>
  import('./VoicePickerModal').then((m) => ({ default: m.VoicePickerModal }))
)
const SpeedPickerModal = React.lazy(() =>
  import('./SpeedPickerModal').then((m) => ({ default: m.SpeedPickerModal }))
)
const TimerPickerModal = React.lazy(() =>
  import('./TimerPickerModal').then((m) => ({ default: m.TimerPickerModal }))
)
const ParagraphPickerModal = React.lazy(() =>
  import('./ParagraphPickerModal').then((m) => ({ default: m.ParagraphPickerModal }))
)

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

const DrawerFallback: React.FC = () => (
  <div className="py-8 flex items-center justify-center text-xs text-slate-400">
    加载面板中...
  </div>
)

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
        {activeDrawer === 'paragraphs' && (
          <Suspense fallback={<DrawerFallback />}>
            <ParagraphPickerModal
              paragraphs={paragraphs}
              currentParaIdx={currentParaIdx}
              ttsPlaying={ttsPlaying}
              onSelectParagraph={onSelectParagraph}
              pillIdleCls={themeCls.pillIdleCls}
              accentActivePillCls={themeCls.accentActivePillCls}
            />
          </Suspense>
        )}
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
        {activeDrawer === 'voices' && (
          <Suspense fallback={<DrawerFallback />}>
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
          </Suspense>
        )}
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
        {activeDrawer === 'speed' && (
          <Suspense fallback={<DrawerFallback />}>
            <SpeedPickerModal
              ttsRate={ttsRate}
              onSelectRate={onSelectRate}
              pillIdleCls={themeCls.pillIdleCls}
              accentActivePillCls={themeCls.accentActivePillCls}
            />
          </Suspense>
        )}
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
        {activeDrawer === 'ambient' && (
          <Suspense fallback={<DrawerFallback />}>
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
          </Suspense>
        )}
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
        {activeDrawer === 'sleep' && (
          <Suspense fallback={<DrawerFallback />}>
            <TimerPickerModal
              sleepMode={sleepMode}
              onSelectSleepMode={onSelectSleepMode}
              pillIdleCls={themeCls.pillIdleCls}
              accentActivePillCls={themeCls.accentActivePillCls}
            />
          </Suspense>
        )}
      </TtsDrawerModal>
    </>
  )
}
