import React, { useState } from 'react'
import { ChevronDown, BookOpen, Power } from 'lucide-react'
import type { AmbientPreset } from '../types'
import { KaraokeTranscriptStream } from './KaraokeTranscriptStream'
import { MobileVinylCoverStage } from './MobileVinylCoverStage'
import { MobileTransportDeck } from './MobileTransportDeck'

export interface MobileMusicPlayerViewProps {
  title: string
  author: string
  chapterTitle: string
  coverUrl?: string
  coverColor: string
  paragraphs: string[]
  currentParaIdx: number
  totalParagraphs: number
  progressPct: number
  isPlaying: boolean
  effectiveSpeed: number
  sleepRemainingText?: string
  internalSleepMinutes: number
  activeVoiceLabel: string
  isAmbientActive: boolean
  ambientPreset: AmbientPreset
  onClose: () => void
  onReturnToReader: () => void
  onExitListening?: () => void
  onSelectParagraph: (idx: number) => void
  onSeekBySeconds?: (deltaSec: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
  onTogglePlay: () => void
  onSelectSpeed: (speed: number) => void
  onSelectSleepTimer: (mins: number) => void
  onToggleAmbient: () => void
  onOpenVoiceModal: () => void
}

export const MobileMusicPlayerView: React.FC<MobileMusicPlayerViewProps> = (props) => {
  const {
    title,
    author,
    chapterTitle,
    coverUrl,
    coverColor,
    paragraphs,
    currentParaIdx,
    isPlaying,
    onClose,
    onReturnToReader,
    onExitListening,
    onSelectParagraph,
  } = props
  const [viewTab, setViewTab] = useState<'cover' | 'lyrics'>('cover')
  const currentParaText =
    paragraphs[currentParaIdx] || paragraphs[0] || '轻点播放键开启沉浸式神经拟真朗读。'

  return (
    <div className="lg:hidden flex-1 min-h-0 flex flex-col justify-between bg-gradient-to-b from-[#161b26] via-[#10141f] to-[#0a0d14] text-slate-100 select-none overflow-hidden">
      <div className="px-3.5 pt-2 pb-2.5 flex flex-col items-center shrink-0 border-b border-white/10 bg-slate-950/40">
        <div className="w-10 h-1 rounded-full bg-slate-500/70 mb-2.5" />
        <div className="w-full flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-2.5 rounded-full bg-slate-800/95 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
            title="下滑或点击收起播放器（后台继续朗读）"
          >
            <ChevronDown className="w-3.5 h-3.5 text-amber-400 stroke-[2.4]" />
            <span>收起</span>
          </button>

          <div className="flex items-center p-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewTab('cover')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewTab === 'cover' ? 'bg-[#1b88ee] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              播放器
            </button>
            <button
              type="button"
              onClick={() => setViewTab('lyrics')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewTab === 'lyrics' ? 'bg-[#1b88ee] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              词幕
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onReturnToReader}
              className="h-8 px-2.5 rounded-full bg-slate-800/95 border border-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="返回纸书正文"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>原文</span>
            </button>
            {onExitListening && (
              <button
                type="button"
                onClick={onExitListening}
                className="h-8 px-2.5 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="退出听书模式"
              >
                <Power className="w-3.5 h-3.5" />
                <span>退出</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {viewTab === 'cover' ? (
        <MobileVinylCoverStage
          title={title}
          author={author}
          chapterTitle={chapterTitle}
          coverUrl={coverUrl}
          coverColor={coverColor}
          isPlaying={isPlaying}
          currentParaText={currentParaText}
          currentParaIdx={currentParaIdx}
          onSwitchToLyrics={() => setViewTab('lyrics')}
        />
      ) : (
        <KaraokeTranscriptStream
          paragraphs={paragraphs}
          currentParagraphIndex={currentParaIdx}
          chapterTitle={chapterTitle}
          onSelectParagraph={onSelectParagraph}
        />
      )}

      <MobileTransportDeck {...props} />
    </div>
  )
}
