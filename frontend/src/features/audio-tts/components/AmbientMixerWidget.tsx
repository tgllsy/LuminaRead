import React from 'react'
import {
  Volume2,
  VolumeX,
  Sparkles,
  CloudRain,
  Flame,
  Wind,
  Waves,
  BookOpen,
  Coffee,
  Activity,
  Headphones,
} from 'lucide-react'
import type { AmbientPreset } from '../types'
import { AMBIENT_SOUND_CONFIGS } from '../constants'

interface AmbientMixerWidgetProps {
  ambientPreset?: AmbientPreset
  ambientVolume?: number
  ambientEnabled?: boolean
  onSelectPreset?: (preset: AmbientPreset) => void
  onVolumeChange?: (vol: number) => void
  onToggleEnabled?: () => void
  onOpenMoreSounds?: () => void
  // 兼容老调用
  rainVol?: number
  fireVol?: number
  windVol?: number
  onChangeRain?: (val: number) => void
  onChangeFire?: (val: number) => void
  onChangeWind?: (val: number) => void
}

const QUICK_PRESETS: { id: AmbientPreset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'rain', label: '夜雨', icon: CloudRain },
  { id: 'fire', label: '壁炉', icon: Flame },
  { id: 'wind', label: '松风', icon: Wind },
  { id: 'waves', label: '海浪', icon: Waves },
  { id: 'study', label: '书房', icon: BookOpen },
  { id: 'cafe', label: '咖啡', icon: Coffee },
  { id: 'pink_noise', label: '粉噪', icon: Activity },
]

export const AmbientMixerWidget: React.FC<AmbientMixerWidgetProps> = ({
  ambientPreset: propPreset,
  ambientVolume = 0.5,
  ambientEnabled = false,
  onSelectPreset,
  onVolumeChange,
  onToggleEnabled,
  onOpenMoreSounds,
  rainVol,
  fireVol,
  windVol,
  onChangeRain,
}) => {
  // 确定有效 Preset（兼容老多轨传入）
  let effectivePreset: AmbientPreset = propPreset || 'off'
  if (!propPreset && effectivePreset === 'off') {
    if ((rainVol ?? 0) > 0) effectivePreset = 'rain'
    else if ((fireVol ?? 0) > 0) effectivePreset = 'fire'
    else if ((windVol ?? 0) > 0) effectivePreset = 'wind'
  }

  const isPlaying = ambientEnabled && effectivePreset !== 'off'
  const currentConfig = AMBIENT_SOUND_CONFIGS[effectivePreset]

  const handleSelectSound = (preset: AmbientPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset)
    } else if (onChangeRain && preset === 'rain') {
      onChangeRain(60)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = Number(e.target.value)
    if (onVolumeChange) {
      onVolumeChange(val)
    } else if (onChangeRain) {
      onChangeRain(Math.round(val * 100))
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3.5 select-none shadow-sm">
      {/* 头部控制 */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-200 flex items-center gap-1.5">
          <Headphones className="w-3.5 h-3.5 text-emerald-400" />
          <span>白噪音伴读</span>
        </span>
        <div className="flex items-center gap-2">
          {onToggleEnabled && (
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={isPlaying ? '点击关闭白噪音' : '点击开启白噪音'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isPlaying ? '伴读中' : '已静音'}</span>
            </button>
          )}
          {isPlaying && (
            <button
              type="button"
              onClick={() => handleSelectSound('off')}
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="静音关闭"
            >
              <VolumeX className="w-3 h-3" />
              <span>关闭</span>
            </button>
          )}
          {onOpenMoreSounds && (
            <button
              type="button"
              onClick={onOpenMoreSounds}
              className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>全部音效</span>
            </button>
          )}
        </div>
      </div>

      {/* 当前音效提示与音量滑块 */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium">
            {isPlaying ? currentConfig?.name : '未开启伴读'}
          </span>
          <span className="font-mono text-emerald-400 text-[10px]">
            {isPlaying ? `${Math.round(ambientVolume * 100)}%` : '0%'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'text-emerald-400' : 'text-slate-500'}`} />
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={ambientVolume}
            disabled={!isPlaying}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={handleSliderChange}
            className="flex-1 accent-emerald-500 h-1.5 bg-white/20 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </div>

      {/* 快捷单音源切换胶囊 */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {QUICK_PRESETS.map((item) => {
          const Icon = item.icon
          const isActive = isPlaying && effectivePreset === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSound(item.id)}
              className={`py-1.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/25 border border-emerald-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
              title={AMBIENT_SOUND_CONFIGS[item.id]?.description}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenMoreSounds}
          className="py-1.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-amber-300 border border-white/5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>更多</span>
        </button>
      </div>
    </div>
  )
}

