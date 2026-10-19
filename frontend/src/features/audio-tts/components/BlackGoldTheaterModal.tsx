import React, { useState } from 'react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useTtsStore } from '../../../stores/ttsStore'
import { KaraokeTranscriptStream } from './KaraokeTranscriptStream'
import { TheaterHeader } from './TheaterHeader'
import { TheaterLeftStage } from './TheaterLeftStage'
import { TheaterTransportBar } from './TheaterTransportBar'
import { QuoteCelebrationModal } from './QuoteCelebrationModal'
import { AmbientMixerModal } from './AmbientMixerModal'
import { AmbientMixerWidget } from './AmbientMixerWidget'
import { useAmbientMixer } from '../hooks/useAmbientMixer'
import { ALL_FALLBACK_VOICES, DEFAULT_THEATER_PARAGRAPHS } from '../constants'
import { saveTtsQuote, copyTextToClipboard, SavedTtsQuote } from '../helpers/quoteStorage'
import type { NeuralVoiceOption, AmbientPreset } from '../types'
import type { BookSummary } from '../../bookshelf/types'

export interface BlackGoldTheaterModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenReader?: (bookId: string) => void
  onLocateOriginalText?: () => void
  books?: BookSummary[]
  bookId?: string
  bookTitle?: string
  bookAuthor?: string
  coverUrl?: string
  coverColor?: string
  chapterTitle?: string
  paragraphs?: string[]
  currentParagraphIndex?: number
  onSelectParagraph?: (index: number) => void
  isPlaying?: boolean
  isLoading?: boolean
  onTogglePlayPause?: () => void
  onStepPrev?: () => void
  onStepNext?: () => void
  onSeekBySeconds?: (deltaSec: number) => void
  voices?: NeuralVoiceOption[]
  activeVoice?: string
  onSelectVoice?: (voiceId: string) => void
  speed?: number
  onSelectSpeed?: (speed: number) => void
  sleepRemainingText?: string
  onSelectSleepTimer?: (minutes: number) => void
  rainVol?: number
  fireVol?: number
  windVol?: number
  onChangeRain?: (val: number) => void
  onChangeFire?: (val: number) => void
  onChangeWind?: (val: number) => void
  ambientPreset?: AmbientPreset
  ambientVolume?: number
  ambientEnabled?: boolean
  onToggleAmbientEnabled?: () => void
  onSetAmbientEnabled?: (enabled: boolean) => void
  isAmbientActive?: boolean
  onSelectAmbientPreset?: (preset: AmbientPreset) => void
  onChangeAmbientVolume?: (vol: number) => void
}

export const BlackGoldTheaterModal: React.FC<BlackGoldTheaterModalProps> = ({
  isOpen, onClose, onOpenReader, onLocateOriginalText, books = [],
  bookId: propBookId, bookTitle: propBookTitle, bookAuthor: propBookAuthor,
  coverUrl: propCoverUrl, coverColor: propCoverColor, chapterTitle: propChapterTitle,
  paragraphs: propParagraphs, currentParagraphIndex: propCurrentParaIdx,
  onSelectParagraph, isPlaying: propIsPlaying, onTogglePlayPause: propTogglePlayPause,
  onStepPrev, onStepNext, onSeekBySeconds, voices: propVoices,
  activeVoice: propActiveVoice, onSelectVoice, speed: propSpeed, onSelectSpeed,
  sleepRemainingText, onSelectSleepTimer, rainVol: propRainVol, fireVol: propFireVol,
  windVol: propWindVol, onChangeRain, onChangeFire, onChangeWind,
  ambientPreset: propAmbientPreset, ambientVolume: propAmbientVolume,
  ambientEnabled: propAmbientEnabled, onToggleAmbientEnabled,
  isAmbientActive: propIsAmbientActive, onSelectAmbientPreset, onChangeAmbientVolume,
}) => {
  const audioStatus = useTtsStore((s) => s.audioStatus)
  const checkpoint = useTtsStore((s) => s.checkpoint)
  const triggerTogglePlayPause = useTtsStore((s) => s.triggerTogglePlayPause)
  const storeParaIdx = useTtsStore((s) => s.activePara ?? audioStatus.paragraphIndex ?? 0)
  const currentParaIdx = propCurrentParaIdx ?? storeParaIdx

  const [internalSpeed, setInternalSpeed] = useState(1.0)
  const [internalSleepMinutes, setInternalSleepMinutes] = useState(0)
  const [internalVoice, setInternalVoice] = useState('zh-CN-XiaoxiaoNeural')
  const [celebrationQuote, setCelebrationQuote] = useState<SavedTtsQuote | null>(null)
  const [showAmbientModal, setShowAmbientModal] = useState(false)

  // 仅在未提供外部控制器时使用 fallback 实例，避免双引擎冲突
  const fallbackAmb = useAmbientMixer(isOpen && !onChangeRain ? 'off' : 'off', 0.5)

  const effectiveRain = propRainVol !== undefined ? propRainVol : fallbackAmb.rainVol
  const effectiveFire = propFireVol !== undefined ? propFireVol : fallbackAmb.fireVol
  const effectiveWind = propWindVol !== undefined ? propWindVol : fallbackAmb.windVol
  const handleRainChange = onChangeRain || fallbackAmb.setRainVol
  const handleFireChange = onChangeFire || fallbackAmb.setFireVol
  const handleWindChange = onChangeWind || fallbackAmb.setWindVol

  const effectiveAmbientPreset = propAmbientPreset !== undefined ? propAmbientPreset : fallbackAmb.ambientPreset
  const effectiveAmbientVolume = propAmbientVolume !== undefined ? propAmbientVolume : fallbackAmb.ambientVolume
  const effectiveAmbientEnabled = propAmbientEnabled !== undefined ? propAmbientEnabled : fallbackAmb.ambientEnabled
  const handleToggleAmbientEnabled = onToggleAmbientEnabled || fallbackAmb.toggleAmbientEnabled
  const effectiveIsAmbientActive = propIsAmbientActive !== undefined ? propIsAmbientActive : fallbackAmb.isAmbientActive
  const handleSelectAmbientPreset = onSelectAmbientPreset || fallbackAmb.setAmbientPreset
  const handleChangeAmbientVolume = onChangeAmbientVolume || fallbackAmb.setAmbientVolume

  if (!isOpen) return null

  const targetBookId = propBookId || audioStatus.bookId || checkpoint?.bookId
  const currentBook = books.find((b) => b.id === targetBookId)
  const title = propBookTitle || audioStatus.bookTitle || checkpoint?.bookTitle || currentBook?.title || '阅境伴读'
  const author = propBookAuthor || currentBook?.author || ''
  const chapterTitle = propChapterTitle || audioStatus.chapterTitle || checkpoint?.chapterTitle || '正文章节'
  const isPlaying = propIsPlaying ?? audioStatus.playing
  const coverUrl = propCoverUrl || currentBook?.cover_url
  const coverColor = propCoverColor || currentBook?.cover_color || '#1e293b'

  const effectiveVoice = propActiveVoice || internalVoice
  const effectiveSpeed = propSpeed ?? internalSpeed
  const effectiveVoices = propVoices && propVoices.length > 0 ? propVoices : ALL_FALLBACK_VOICES
  const effectiveParagraphs = propParagraphs && propParagraphs.length > 0 ? propParagraphs : DEFAULT_THEATER_PARAGRAPHS
  const totalParagraphs = effectiveParagraphs.length
  const progressPct = Math.round(((currentParaIdx + 1) / Math.max(1, totalParagraphs)) * 100)

  const handleTogglePlay = () => {
    if (propTogglePlayPause) propTogglePlayPause()
    else triggerTogglePlayPause()
  }

  const handleVoiceChange = (vId: string) => {
    setInternalVoice(vId)
    onSelectVoice?.(vId)
  }

  const handleSpeedChange = (speedVal: number) => {
    setInternalSpeed(speedVal)
    onSelectSpeed?.(speedVal)
  }

  const handleSleepTimerChange = (minutes: number) => {
    setInternalSleepMinutes(minutes)
    onSelectSleepTimer?.(minutes)
  }

  const handleExtractQuote = async (text: string) => {
    const q = saveTtsQuote(text, title, chapterTitle)
    await copyTextToClipboard(text)
    setCelebrationQuote(q)
  }

  const handleReturnToReader = () => {
    if (onLocateOriginalText) {
      onLocateOriginalText()
    } else if (targetBookId && onOpenReader) {
      onOpenReader(targetBookId)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 h-dvh pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] z-50 bg-[#0c0d14] text-white flex flex-col select-none overflow-hidden animate-in fade-in-0 duration-200">
      <TheaterHeader
        title={title}
        chapterTitle={chapterTitle}
        onReturnToReader={handleReturnToReader}
        onClose={onClose}
      />

      <div className="flex-1 flex overflow-hidden">
        <TheaterLeftStage
          title={title}
          author={author}
          coverUrl={coverUrl}
          coverColor={coverColor}
          isPlaying={isPlaying}
          effectiveVoice={effectiveVoice}
          voices={effectiveVoices}
          onVoiceChange={handleVoiceChange}
          ambientPreset={effectiveAmbientPreset}
          ambientVolume={effectiveAmbientVolume}
          onSelectAmbientPreset={handleSelectAmbientPreset}
          onChangeAmbientVolume={handleChangeAmbientVolume}
          rainVol={effectiveRain}
          fireVol={effectiveFire}
          windVol={effectiveWind}
          onChangeRain={handleRainChange}
          onChangeFire={handleFireChange}
          onChangeWind={handleWindChange}
          onOpenAmbientModal={() => setShowAmbientModal(true)}
          ambientEnabled={effectiveAmbientEnabled}
          onToggleAmbientEnabled={handleToggleAmbientEnabled}
        />

        <KaraokeTranscriptStream
          paragraphs={effectiveParagraphs}
          currentParagraphIndex={currentParaIdx}
          chapterTitle={chapterTitle}
          onSelectParagraph={onSelectParagraph || (() => {})}
          onExtractQuote={handleExtractQuote}
        />
      </div>

      <TheaterTransportBar
        currentParaIdx={currentParaIdx}
        totalParagraphs={totalParagraphs}
        progressPct={progressPct}
        isPlaying={isPlaying}
        effectiveSpeed={effectiveSpeed}
        sleepRemainingText={sleepRemainingText}
        internalSleepMinutes={internalSleepMinutes}
        onSeekBySeconds={onSeekBySeconds}
        onStepPrev={onStepPrev}
        onStepNext={onStepNext}
        onTogglePlay={handleTogglePlay}
        onToggleSpeed={() => {
          const speeds = [0.8, 1.0, 1.25, 1.5, 2.0]
          const next = speeds[(speeds.indexOf(effectiveSpeed) + 1) % speeds.length]
          handleSpeedChange(next)
        }}
        onSelectSpeed={handleSpeedChange}
        onToggleSleepTimer={() => {
          const timers = [15, 30, 45, 60, 0]
          const next = timers[(timers.indexOf(internalSleepMinutes) + 1) % timers.length]
          handleSleepTimerChange(next)
        }}
        onSelectSleepTimer={handleSleepTimerChange}
        onSelectParagraph={onSelectParagraph}
        isAmbientActive={effectiveAmbientEnabled && effectiveIsAmbientActive}
        ambientPreset={effectiveAmbientPreset}
        onToggleAmbient={() => setShowAmbientModal((v) => !v)}
      />

      <BottomSheet
        isOpen={showAmbientModal}
        onClose={() => setShowAmbientModal(false)}
        title="白噪音伴读调音台"
        subtitle="自由混音环境声效，沉浸专注阅读"
        isDark={true}
        maxWidthClass="md:max-w-lg"
      >
        <div className="p-5 sm:p-6">
          <AmbientMixerModal
            ambientEnabled={effectiveAmbientEnabled}
            onToggleEnabled={handleToggleAmbientEnabled}
            ambientPreset={effectiveAmbientPreset}
            ambientVolume={effectiveAmbientVolume}
            onSelectPreset={handleSelectAmbientPreset}
            onVolumeChange={handleChangeAmbientVolume}
            pillIdleCls="bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            accentActivePillCls="bg-emerald-600 text-white font-bold border border-emerald-500 shadow-md shadow-emerald-500/20"
            mutedTextCls="text-slate-400"
          />
        </div>
      </BottomSheet>

      <QuoteCelebrationModal
        quote={celebrationQuote}
        onClose={() => setCelebrationQuote(null)}
      />
    </div>
  )
}
