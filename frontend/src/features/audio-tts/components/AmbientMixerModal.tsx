import React from 'react'
import { VolumeX, CloudRain, Flame, Coffee, Wind, Volume2 } from 'lucide-react'
import type { AmbientPreset } from '../types'

interface AmbientMixerModalProps {
  ambientPreset: AmbientPreset
  ambientVolume: number
  onSelectPreset: (preset: AmbientPreset) => void
  onVolumeChange: (vol: number) => void
  pillIdleCls: string
  accentActivePillCls: string
  mutedTextCls: string
}

export const AmbientMixerModal: React.FC<AmbientMixerModalProps> = ({
  ambientPreset,
  ambientVolume,
  onSelectPreset,
  onVolumeChange,
  pillIdleCls,
  accentActivePillCls,
  mutedTextCls,
}) => {
  const items = [
    { id: 'off' as AmbientPreset, label: '静音', icon: VolumeX },
    { id: 'rain' as AmbientPreset, label: '江南夜雨', icon: CloudRain },
    { id: 'fire' as AmbientPreset, label: '冬日壁炉', icon: Flame },
    { id: 'study' as AmbientPreset, label: '深夜书房', icon: Coffee },
    { id: 'wind' as AmbientPreset, label: '山谷松风', icon: Wind },
  ]

  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = ambientPreset === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPreset(item.id)}
              className={`py-3 px-1 rounded-2xl text-xs flex flex-col items-center gap-1.5 transition-all ${
                active ? accentActivePillCls : pillIdleCls
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate text-[11px]">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 px-1">
        <Volume2 className={`w-4 h-4 shrink-0 ${mutedTextCls}`} />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={ambientVolume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="flex-1 accent-emerald-700 h-1.5 cursor-pointer"
        />
        <span className={`text-xs font-mono w-10 text-right ${mutedTextCls}`}>
          {Math.round(ambientVolume * 100)}%
        </span>
      </div>
    </div>
  )
}
