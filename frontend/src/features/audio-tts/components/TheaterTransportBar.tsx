import React, { useState, useRef, useEffect } from 'react'
import { RotateCcw, RotateCw, SkipBack, SkipForward, Play, Pause, Moon, Gauge, Check, Headphones, Mic } from 'lucide-react'
import type { AmbientPreset } from '../types'
import { AMBIENT_LABEL_MAP } from '../constants'

interface TheaterTransportBarProps {
  currentParaIdx: number
  totalParagraphs: number
  progressPct: number
  isPlaying: boolean
  effectiveSpeed: number
  sleepRemainingText?: string
  internalSleepMinutes: number
  onSeekBySeconds?: (deltaSec: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
  onTogglePlay: () => void
  onToggleSpeed: () => void
  onSelectSpeed?: (speed: number) => void
  onToggleSleepTimer: () => void
  onSelectSleepTimer?: (minutes: number) => void
  onSelectParagraph?: (index: number) => void
  isAmbientActive?: boolean
  ambientPreset?: AmbientPreset
  onToggleAmbient?: () => void
  onOpenVoiceModal?: () => void
  activeVoiceLabel?: string
}

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 1.75, 2.0]
const TIMER_OPTIONS = [
  { mins: 0, label: '关闭定时' },
  { mins: 15, label: '15 分钟' },
  { mins: 30, label: '30 分钟' },
  { mins: 45, label: '45 分钟' },
  { mins: 60, label: '60 分钟' },
]

export const TheaterTransportBar: React.FC<TheaterTransportBarProps> = ({
  currentParaIdx,
  totalParagraphs,
  progressPct,
  isPlaying,
  effectiveSpeed,
  sleepRemainingText,
  internalSleepMinutes,
  onSeekBySeconds,
  onStepPrev,
  onStepNext,
  onTogglePlay,
  onToggleSpeed,
  onSelectSpeed,
  onToggleSleepTimer,
  onSelectSleepTimer,
  onSelectParagraph,
  isAmbientActive = false,
  ambientPreset = 'off',
  onToggleAmbient,
  onOpenVoiceModal,
  activeVoiceLabel = '切换音色',
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const timerMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false)
      }
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectParagraph || totalParagraphs <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = clickX / rect.width
    const targetIdx = Math.min(totalParagraphs - 1, Math.max(0, Math.floor(ratio * totalParagraphs)))
    onSelectParagraph(targetIdx)
  }

  return (
    <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0 z-30 select-none">
      {/* Progress Scrubber (Full width on mobile, left block on desktop) */}
      <div className="w-full sm:w-52 lg:w-56 space-y-1 sm:space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>正在朗读</span>
          <span className="text-amber-400 font-bold">
            第 {currentParaIdx + 1} / {totalParagraphs} 段 ({progressPct}%)
          </span>
        </div>
        <div
          onClick={handleProgressBarClick}
          className="h-1.5 sm:h-2 bg-white/15 hover:bg-white/25 rounded-full overflow-hidden cursor-pointer relative group transition-all"
          title="点击跳转段落"
        >
          <div
            className="h-full bg-gradient-to-r from-[#1b88ee] to-amber-400 transition-all duration-200 rounded-full"
            style={{ width: `${Math.min(100, Math.max(2, progressPct))}%` }}
          />
        </div>
      </div>

      {/* Main Playback Controls (Dead-center symmetric row) */}
      <div className="flex items-center justify-center gap-5 sm:gap-6 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onSeekBySeconds?.(-15)}
          className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          title="快退 15 秒"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onStepPrev}
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
          title="上一段"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#1b88ee] to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={onStepNext}
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
          title="下一段"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onSeekBySeconds?.(15)}
          className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          title="快进 15 秒"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Feature Pills: Voice (Mobile/Tablet), Ambient, Speed, Sleep Timer */}
      <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-2.5 text-xs w-full sm:w-auto">
        {onOpenVoiceModal && (
          <button
            type="button"
            onClick={onOpenVoiceModal}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white text-xs cursor-pointer transition-all active:scale-95"
            title="选择朗读音色"
          >
            <Mic className="w-3.5 h-3.5 text-[#60a5fa] shrink-0" />
            <span className="truncate max-w-[72px]">{activeVoiceLabel}</span>
          </button>
        )}

        {onToggleAmbient && (
          <button
            type="button"
            onClick={onToggleAmbient}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all active:scale-95 ${
              isAmbientActive
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="调节白噪音与自然音效"
          >
            <Headphones className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isAmbientActive ? AMBIENT_LABEL_MAP[ambientPreset] || '白噪音' : '白噪音'}
            </span>
            {isAmbientActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* Speed button & popover */}
        <div className="relative" ref={speedMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowSpeedMenu(!showSpeedMenu)
              setShowTimerMenu(false)
            }}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-xl border border-white/10 text-white font-mono font-bold cursor-pointer transition-colors active:scale-95"
            title="点击选择语速"
          >
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span>{effectiveSpeed}x</span>
          </button>

          {showSpeedMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-32 bg-[#181a28] border border-white/15 rounded-2xl p-1.5 shadow-2xl space-y-1 z-50">
              <div className="text-[10px] text-slate-400 px-2 py-1 font-sans">播放语速</div>
              {SPEED_OPTIONS.map((spd) => {
                const isCur = Math.abs(effectiveSpeed - spd) < 0.05
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      if (onSelectSpeed) onSelectSpeed(spd)
                      else onToggleSpeed()
                      setShowSpeedMenu(false)
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-colors ${
                      isCur ? 'bg-[#1b88ee] text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span>{spd}x</span>
                    {isCur && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Timer button & popover */}
        <div className="relative" ref={timerMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowTimerMenu(!showTimerMenu)
              setShowSpeedMenu(false)
            }}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors active:scale-95"
            title="点击选择定时关闭"
          >
            <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              {sleepRemainingText || (internalSleepMinutes > 0 ? `${internalSleepMinutes}分` : '定时')}
            </span>
          </button>

          {showTimerMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-36 bg-[#181a28] border border-white/15 rounded-2xl p-1.5 shadow-2xl space-y-1 z-50">
              <div className="text-[10px] text-slate-400 px-2 py-1 font-sans">定时睡眠关闭</div>
              {TIMER_OPTIONS.map((item) => {
                const isCur = item.mins === 0 ? internalSleepMinutes === 0 : internalSleepMinutes === item.mins
                return (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => {
                      if (onSelectSleepTimer) onSelectSleepTimer(item.mins)
                      else onToggleSleepTimer()
                      setShowTimerMenu(false)
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                      isCur ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isCur && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

