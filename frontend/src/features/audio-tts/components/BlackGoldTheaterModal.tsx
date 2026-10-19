import React, { useState, useRef } from 'react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useTtsStore } from '../../../stores/ttsStore'
import { KaraokeTranscriptStream } from './KaraokeTranscriptStream'
import { TheaterHeader } from './TheaterHeader'
import { TheaterLeftStage } from './TheaterLeftStage'
import { TheaterTransportBar } from './TheaterTransportBar'
import { MobileMusicPlayerView } from './MobileMusicPlayerView'
import { AmbientMixerModal } from './AmbientMixerModal'
import { useAmbientMixer } from '../hooks/useAmbientMixer'
import { ALL_FALLBACK_VOICES, DEFAULT_THEATER_PARAGRAPHS } from '../constants'
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

function useSwipeDownHide(onClose: () => void) {
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)
  const startXRef = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const target = e.target as HTMLElement | null
    const scrollable = target?.closest('[data-tts-scroll="true"]') as HTMLElement | null
    if (scrollable && scrollable.scrollTop > 4) {
      startYRef.current = null
      return
    }
    startYRef.current = e.touches[0].clientY
    startXRef.current = e.touches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null || startXRef.current === null || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startYRef.current
    const dx = Math.abs(e.touches[0].clientX - startXRef.current)
    if (dy > 8 && dy > dx * 1.2) {
      setDragY(dy)
    }
  }

  const onTouchEnd = () => {
    const shouldHide = dragY > 56
    setDragY(0)
    startYRef.current = null
    startXRef.current = null
    if (shouldHide) onClose()
  }

  return { dragY, onTouchStart, onTouchMove, onTouchEnd }
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
  const [showAmbientModal, setShowAmbientModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  const swipe = useSwipeDownHide(onClose)
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
  const activeVoiceObj = effectiveVoices.find((v) => v.id === effectiveVoice)
  const activeVoiceLabel = activeVoiceObj?.shortName || activeVoiceObj?.name?.split(' ')[0] || '音色'
  const effectiveParagraphs = propParagraphs && propParagraphs.length > 0 ? propParagraphs : DEFAULT_THEATER_PARAGRAPHS
  const totalParagraphs = effectiveParagraphs.length
  const progressPct = Math.round(((currentParaIdx + 1) / Math.max(1, totalParagraphs)) * 100)

  const handleTogglePlay = () => { if (propTogglePlayPause) propTogglePlayPause(); else triggerTogglePlayPause() }
  const handleVoiceChange = (vId: string) => { setInternalVoice(vId); onSelectVoice?.(vId) }
  const handleSpeedChange = (speedVal: number) => { setInternalSpeed(speedVal); onSelectSpeed?.(speedVal) }
  const handleSleepTimerChange = (minutes: number) => { setInternalSleepMinutes(minutes); onSelectSleepTimer?.(minutes) }
  const handleReturnToReader = () => {
    if (onLocateOriginalText) onLocateOriginalText()
    else if (targetBookId && onOpenReader) onOpenReader(targetBookId)
    else onClose()
  }

  return (
    <div
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
      style={swipe.dragY > 0 ? { transform: `translateY(${swipe.dragY}px)`, transition: 'none' } : undefined}
      className="fixed inset-0 h-dvh pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] z-50 bg-[#0c0d14] text-white flex flex-col select-none overflow-hidden transition-transform duration-200 ease-out animate-in fade-in-0"
    >
      <div className="hidden lg:block">
        <TheaterHeader title={title} chapterTitle={chapterTitle} onReturnToReader={handleReturnToReader} onClose={onClose} />
      </div>

      {/* 移动端：音乐播放器样式（支持下滑隐藏与黑胶/词幕切换） */}
      <MobileMusicPlayerView
        title={title} author={author} chapterTitle={chapterTitle} coverUrl={coverUrl} coverColor={coverColor}
        paragraphs={effectiveParagraphs} currentParaIdx={currentParaIdx} totalParagraphs={totalParagraphs}
        progressPct={progressPct} isPlaying={isPlaying} effectiveSpeed={effectiveSpeed}
        sleepRemainingText={sleepRemainingText} internalSleepMinutes={internalSleepMinutes}
        activeVoiceLabel={activeVoiceLabel} isAmbientActive={effectiveAmbientEnabled && effectiveIsAmbientActive}
        ambientPreset={effectiveAmbientPreset} onClose={onClose} onReturnToReader={handleReturnToReader}
        onSelectParagraph={onSelectParagraph || (() => {})}
        onSeekBySeconds={onSeekBySeconds} onStepPrev={onStepPrev} onStepNext={onStepNext}
        onTogglePlay={handleTogglePlay} onSelectSpeed={handleSpeedChange}
        onSelectSleepTimer={handleSleepTimerChange} onToggleAmbient={() => setShowAmbientModal((v) => !v)}
        onOpenVoiceModal={() => setShowVoiceModal(true)}
      />

      {/* 桌面端：双栏大剧场（TheaterLeftStage 内部自带 hidden lg:flex，且承载双端共用的声源库 BottomSheet） */}
      <div className="lg:flex-1 lg:flex lg:overflow-hidden">
        <TheaterLeftStage
          title={title} author={author} coverUrl={coverUrl} coverColor={coverColor} isPlaying={isPlaying}
          effectiveVoice={effectiveVoice} voices={effectiveVoices} onVoiceChange={handleVoiceChange}
          ambientPreset={effectiveAmbientPreset} ambientVolume={effectiveAmbientVolume}
          onSelectAmbientPreset={handleSelectAmbientPreset} onChangeAmbientVolume={handleChangeAmbientVolume}
          rainVol={effectiveRain} fireVol={effectiveFire} windVol={effectiveWind}
          onChangeRain={handleRainChange} onChangeFire={handleFireChange} onChangeWind={handleWindChange}
          onOpenAmbientModal={() => setShowAmbientModal(true)} ambientEnabled={effectiveAmbientEnabled}
          onToggleAmbientEnabled={handleToggleAmbientEnabled} externalVoiceModalOpen={showVoiceModal}
          onSetExternalVoiceModalOpen={setShowVoiceModal}
        />
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <KaraokeTranscriptStream
            paragraphs={effectiveParagraphs} currentParagraphIndex={currentParaIdx}
            chapterTitle={chapterTitle} onSelectParagraph={onSelectParagraph || (() => {})}
          />
        </div>
      </div>

      <div className="hidden lg:block">
        <TheaterTransportBar
          currentParaIdx={currentParaIdx} totalParagraphs={totalParagraphs} progressPct={progressPct}
          isPlaying={isPlaying} effectiveSpeed={effectiveSpeed} sleepRemainingText={sleepRemainingText}
          internalSleepMinutes={internalSleepMinutes} onSeekBySeconds={onSeekBySeconds}
          onStepPrev={onStepPrev} onStepNext={onStepNext} onTogglePlay={handleTogglePlay}
          onToggleSpeed={() => {
            const speeds = [0.8, 1.0, 1.25, 1.5, 2.0]
            handleSpeedChange(speeds[(speeds.indexOf(effectiveSpeed) + 1) % speeds.length])
          }}
          onSelectSpeed={handleSpeedChange}
          onToggleSleepTimer={() => {
            const timers = [15, 30, 45, 60, 0]
            handleSleepTimerChange(timers[(timers.indexOf(internalSleepMinutes) + 1) % timers.length])
          }}
          onSelectSleepTimer={handleSleepTimerChange} onSelectParagraph={onSelectParagraph}
          isAmbientActive={effectiveAmbientEnabled && effectiveIsAmbientActive} ambientPreset={effectiveAmbientPreset}
          onToggleAmbient={() => setShowAmbientModal((v) => !v)} onOpenVoiceModal={() => setShowVoiceModal(true)}
          activeVoiceLabel={activeVoiceLabel}
        />
      </div>

      <BottomSheet
        isOpen={showAmbientModal} onClose={() => setShowAmbientModal(false)}
        title="白噪音伴读调音台" subtitle="自由混音环境声效，沉浸专注阅读"
        isDark={true} maxWidthClass="md:max-w-lg"
      >
        <div className="p-5 sm:p-6">
          <AmbientMixerModal
            ambientEnabled={effectiveAmbientEnabled} onToggleEnabled={handleToggleAmbientEnabled}
            ambientPreset={effectiveAmbientPreset} ambientVolume={effectiveAmbientVolume}
            onSelectPreset={handleSelectAmbientPreset} onVolumeChange={handleChangeAmbientVolume}
            pillIdleCls="bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            accentActivePillCls="bg-emerald-600 text-white font-bold border border-emerald-500 shadow-md shadow-emerald-500/20"
            mutedTextCls="text-slate-400"
          />
        </div>
      </BottomSheet>
    </div>
  )
}

