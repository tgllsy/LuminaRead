import React from 'react'
import {
  Timer,
  Radio,
  Gauge,
  Headphones,
  RotateCcw,
  RotateCw,
  BookOpen,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Loader2,
  List,
} from 'lucide-react'
import type { ActiveTtsDrawer, SleepTimerMode, AmbientPreset } from '../types'
import { formatCountdown } from '../helpers'
import { AMBIENT_LABEL_MAP } from '../constants'

interface TtsPlayerBarProps {
  activeDrawer: ActiveTtsDrawer
  onToggleDrawer: (drawer: ActiveTtsDrawer) => void
  sleepMode: SleepTimerMode
  sleepRemainingSec: number
  activeVoiceShortName: string
  ttsRate: number
  ambientPreset: AmbientPreset
  chapterProgressPct: number
  displayElapsed: string
  displayTotal: string
  ttsPlaying: boolean
  ttsPaused: boolean
  ttsLoading: boolean
  canStepPrev: boolean
  onSeekInChapter: (e: React.MouseEvent<HTMLDivElement>) => void
  onSeekBySeconds: (sec: number) => void
  onTogglePlayPause: () => void
  onStepPrev: () => void
  onStepNext: () => void
  onClose: () => void
  onLocateOriginalText?: () => void
  onOpenToc?: () => void
  isDark: boolean
  mutedTextCls: string
  cardBgCls: string
  accentBtnCls: string
  activeTextAccentCls: string
}

export const TtsPlayerBar: React.FC<TtsPlayerBarProps> = ({
  activeDrawer,
  onToggleDrawer,
  sleepMode,
  sleepRemainingSec,
  activeVoiceShortName,
  ttsRate,
  ambientPreset,
  chapterProgressPct,
  displayElapsed,
  displayTotal,
  ttsPlaying,
  ttsPaused,
  ttsLoading,
  canStepPrev,
  onSeekInChapter,
  onSeekBySeconds,
  onTogglePlayPause,
  onStepPrev,
  onStepNext,
  onClose,
  onLocateOriginalText,
  onOpenToc,
  isDark,
  mutedTextCls,
  cardBgCls,
  accentBtnCls,
  activeTextAccentCls,
}) => {

  return (
    <div className="w-full px-6 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-2 space-y-5 shrink-0">
      {/* 极简四图标栏 */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onToggleDrawer('sleep')}
          className={`flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-colors ${
            activeDrawer === 'sleep' || sleepMode !== 'off'
              ? activeTextAccentCls
              : `${mutedTextCls} hover:opacity-100`
          }`}
        >
          <Timer className="w-5 h-5 stroke-[1.7]" />
          <span className="text-[11px] font-medium whitespace-nowrap">
            {sleepMode === 'off'
              ? '定时关闭'
              : sleepMode === 'chapter_end'
              ? '本章后停'
              : formatCountdown(sleepRemainingSec)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggleDrawer('voices')}
          className={`flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-colors ${
            activeDrawer === 'voices'
              ? activeTextAccentCls
              : `${mutedTextCls} hover:opacity-100`
          }`}
        >
          <Radio className="w-5 h-5 stroke-[1.7]" />
          <span className="text-[11px] font-medium truncate max-w-[82px]">
            {activeVoiceShortName.split(' ')[0]}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggleDrawer('speed')}
          className={`flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-colors ${
            activeDrawer === 'speed' || Math.abs(ttsRate - 1.0) >= 0.04
              ? activeTextAccentCls
              : `${mutedTextCls} hover:opacity-100`
          }`}
        >
          <Gauge className="w-5 h-5 stroke-[1.7]" />
          <span className="text-[11px] font-medium whitespace-nowrap">
            语速 {ttsRate.toFixed(1)}x
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggleDrawer('ambient')}
          className={`flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-colors ${
            activeDrawer === 'ambient' || ambientPreset !== 'off'
              ? activeTextAccentCls
              : `${mutedTextCls} hover:opacity-100`
          }`}
        >
          <Headphones className="w-5 h-5 stroke-[1.7]" />
          <span className="text-[11px] font-medium whitespace-nowrap">
            {AMBIENT_LABEL_MAP[ambientPreset]}
          </span>
        </button>
      </div>

      {/* 极简进度条 */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onSeekBySeconds(-15)}
          title="后退 15 秒"
          className={`relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-current/8 transition-colors shrink-0 ${mutedTextCls}`}
        >
          <RotateCcw className="w-5 h-5 stroke-[1.6]" />
          <span className="absolute text-[8px] font-mono font-bold mt-0.5">15</span>
        </button>

        <div
          onClick={onSeekInChapter}
          title="点击调整本章播放进度"
          className="flex-1 h-8 flex items-center relative cursor-pointer"
        >
          <div className="w-full h-1 bg-current/12 rounded-full overflow-hidden">
            <div
              style={{ width: `${chapterProgressPct}%` }}
              className={`h-full transition-all duration-150 ${
                isDark ? 'bg-amber-400/70' : 'bg-emerald-700/60'
              }`}
            />
          </div>
          <div
            style={{
              left: `calc(${Math.min(100, Math.max(0, chapterProgressPct))}% - ${
                (Math.min(100, Math.max(0, chapterProgressPct)) / 100) * 88
              }px)`,
            }}
            className={`absolute px-2.5 py-0.5 rounded-full text-[11px] font-mono shadow-xs border whitespace-nowrap transition-all duration-150 ${cardBgCls}`}
          >
            {displayElapsed} / {displayTotal}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSeekBySeconds(15)}
          title="快进 15 秒"
          className={`relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-current/8 transition-colors shrink-0 ${mutedTextCls}`}
        >
          <RotateCw className="w-5 h-5 stroke-[1.6]" />
          <span className="absolute text-[8px] font-mono font-bold mt-0.5">15</span>
        </button>
      </div>

      {/* 主播控栏 */}
      <div className="flex items-center justify-between px-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (onLocateOriginalText) {
              onLocateOriginalText()
            } else {
              onClose()
            }
          }}
          title="返回正文并定位到当前朗读位置"
          className={`flex flex-col items-center gap-1 transition-all ${mutedTextCls} hover:opacity-100 active:scale-95 cursor-pointer`}
        >
          <BookOpen className="w-5 h-5 stroke-[1.7]" />
          <span className="text-[11px] font-medium">原文</span>
        </button>

        <button
          type="button"
          onClick={onStepPrev}
          disabled={!canStepPrev}
          title="上一段"
          className="p-2.5 rounded-full hover:bg-current/8 disabled:opacity-30 transition-colors"
        >
          <SkipBack className="w-6 h-6 fill-current" />
        </button>

        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={ttsPlaying ? '暂停' : '播放'}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 ${accentBtnCls}`}
        >
          {ttsLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : ttsPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={onStepNext}
          title="下一段"
          className="p-2.5 rounded-full hover:bg-current/8 transition-colors"
        >
          <SkipForward className="w-6 h-6 fill-current" />
        </button>

        <button
          type="button"
          onClick={() => {
            onClose()
            onOpenToc?.()
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${mutedTextCls} hover:opacity-100`}
        >
          <List className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] font-medium">目录</span>
        </button>
      </div>
    </div>
  )
}
