import React, { useState } from 'react'
import {
  RotateCcw, RotateCw, SkipBack, SkipForward, Play, Pause,
  Mic, Headphones, Gauge, Moon, Check,
} from 'lucide-react'
import type { AmbientPreset } from '../types'
import { AMBIENT_LABEL_MAP, MOBILE_SPEED_OPTIONS, MOBILE_TIMER_OPTIONS } from '../constants'

export interface MobileTransportDeckProps {
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

export const MobileTransportDeck: React.FC<MobileTransportDeckProps> = ({
  currentParaIdx,
  totalParagraphs,
  progressPct,
  isPlaying,
  effectiveSpeed,
  sleepRemainingText,
  internalSleepMinutes,
  activeVoiceLabel,
  isAmbientActive,
  ambientPreset,
  onSelectParagraph,
  onSeekBySeconds,
  onStepPrev,
  onStepNext,
  onTogglePlay,
  onSelectSpeed,
  onSelectSleepTimer,
  onToggleAmbient,
  onOpenVoiceModal,
}) => {
  const [activePopup, setActivePopup] = useState<'none' | 'speed' | 'timer'>('none')

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalParagraphs <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const targetIdx = Math.min(totalParagraphs - 1, Math.max(0, Math.floor((clickX / rect.width) * totalParagraphs)))
    onSelectParagraph(targetIdx)
  }

  return (
    <div className="px-5 pt-3 pb-4 bg-slate-950/90 border-t border-slate-800/90 space-y-3.5 shrink-0 relative">
      {activePopup !== 'none' && (
        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl grid grid-cols-3 gap-1.5 text-xs">
          {activePopup === 'speed'
            ? MOBILE_SPEED_OPTIONS.map((spd) => {
                const isCur = Math.abs(effectiveSpeed - spd) < 0.05
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      onSelectSpeed(spd)
                      setActivePopup('none')
                    }}
                    className={`py-2 px-2.5 rounded-xl font-mono flex items-center justify-center gap-1 ${
                      isCur ? 'bg-[#1b88ee] text-white font-bold' : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{spd}x</span>
                    {isCur && <Check className="w-3 h-3" />}
                  </button>
                )
              })
            : MOBILE_TIMER_OPTIONS.map((item) => {
                const isCur = item.mins === internalSleepMinutes
                return (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => {
                      onSelectSleepTimer(item.mins)
                      setActivePopup('none')
                    }}
                    className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 ${
                      isCur ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isCur && <Check className="w-3 h-3" />}
                  </button>
                )
              })}
        </div>
      )}

      {/* 四大音乐功能胶囊 */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="py-2 px-2 rounded-xl bg-slate-800/95 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{activeVoiceLabel}</span>
        </button>
        <button
          type="button"
          onClick={onToggleAmbient}
          className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
            isAmbientActive
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 font-bold'
              : 'bg-slate-800/95 border-slate-700 text-slate-200'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{isAmbientActive ? AMBIENT_LABEL_MAP[ambientPreset] || '白噪音' : '白噪音'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePopup((p) => (p === 'speed' ? 'none' : 'speed'))}
          className={`py-2 px-2 rounded-xl border font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer ${
            activePopup === 'speed' ? 'bg-[#1b88ee] border-[#1b88ee] text-white' : 'bg-slate-800/95 border-slate-700 text-slate-100'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{effectiveSpeed}x</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePopup((p) => (p === 'timer' ? 'none' : 'timer'))}
          className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer ${
            activePopup === 'timer' || internalSleepMinutes > 0
              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-bold'
              : 'bg-slate-800/95 border-slate-700 text-slate-200'
          }`}
        >
          <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {sleepRemainingText && sleepRemainingText !== '已关闭'
              ? sleepRemainingText
              : internalSleepMinutes > 0
              ? `${internalSleepMinutes}分`
              : '定时'}
          </span>
        </button>
      </div>

      {/* 进度条 */}
      <div className="space-y-1.5">
        <div
          onClick={handleProgressBarClick}
          className="h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
        >
          <div
            className="h-full bg-gradient-to-r from-[#1b88ee] to-amber-400 rounded-full transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(3, progressPct))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span>第 {currentParaIdx + 1} 段</span>
          <span className="text-amber-400 font-bold">共 {totalParagraphs} 段 ({progressPct}%)</span>
        </div>
      </div>

      {/* 五键对称音乐播控 */}
      <div className="flex items-center justify-between px-2 pt-0.5">
        <button
          type="button"
          onClick={() => onSeekBySeconds?.(-15)}
          className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="快退 15 秒"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onStepPrev}
          className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="上一段"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1b88ee] to-sky-400 text-white flex items-center justify-center shadow-[0_8px_28px_rgba(27,136,238,0.45)] ring-4 ring-[#1b88ee]/20 active:scale-95 transition-all cursor-pointer"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={onStepNext}
          className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="下一段"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => onSeekBySeconds?.(15)}
          className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="快进 15 秒"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
