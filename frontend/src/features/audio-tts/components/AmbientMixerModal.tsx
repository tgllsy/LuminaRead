import React, { useState } from 'react'
import {
  VolumeX,
  CloudRain,
  Flame,
  Wind,
  Waves,
  BookOpen,
  Coffee,
  Activity,
  Radio,
  Disc,
  Volume2,
} from 'lucide-react'
import type { AmbientPreset } from '../types'
import { AMBIENT_SOUND_CONFIGS } from '../constants'

interface AmbientMixerModalProps {
  ambientEnabled?: boolean
  onToggleEnabled?: () => void
  ambientPreset: AmbientPreset
  ambientVolume: number
  onSelectPreset: (preset: AmbientPreset) => void
  onVolumeChange: (vol: number) => void
  pillIdleCls: string
  accentActivePillCls: string
  mutedTextCls: string
}

type SoundCategory = 'all' | 'nature' | 'scene' | 'noise'

interface SoundItem {
  id: AmbientPreset
  label: string
  desc: string
  category: 'nature' | 'scene' | 'noise' | 'control'
  icon: React.ComponentType<{ className?: string }>
}

const SOUND_ITEMS: SoundItem[] = [
  { id: 'off', label: '静音', desc: '关闭环境音效', category: 'control', icon: VolumeX },
  { id: 'rain', label: '江南夜雨', desc: '窗外细雨潺潺', category: 'nature', icon: CloudRain },
  { id: 'fire', label: '冬日壁炉', desc: '温暖柴火噼啪', category: 'nature', icon: Flame },
  { id: 'wind', label: '山谷松风', desc: '微风穿过树林', category: 'nature', icon: Wind },
  { id: 'waves', label: '潮汐海浪', desc: '舒缓浪涌拍岸', category: 'nature', icon: Waves },
  { id: 'study', label: '深夜书房', desc: '静谧馆阁翻页', category: 'scene', icon: BookOpen },
  { id: 'cafe', label: '午后咖啡', desc: '惬意松弛漫读', category: 'scene', icon: Coffee },
  { id: 'pink_noise', label: '纯净粉噪', desc: '1/f 均衡护耳助眠', category: 'noise', icon: Activity },
  { id: 'white_noise', label: '纯净白噪', desc: '等能量遮蔽杂音', category: 'noise', icon: Radio },
  { id: 'brown_noise', label: '深度褐噪', desc: '低频深沉专注', category: 'noise', icon: Disc },
]

export const AmbientMixerModal: React.FC<AmbientMixerModalProps> = ({
  ambientEnabled = false,
  onToggleEnabled,
  ambientPreset,
  ambientVolume,
  onSelectPreset,
  onVolumeChange,
  pillIdleCls,
  accentActivePillCls,
  mutedTextCls,
}) => {
  const [activeTab, setActiveTab] = useState<SoundCategory>('all')

  const filteredItems = SOUND_ITEMS.filter((item) => {
    if (activeTab === 'all') return true
    if (item.category === 'control') return true
    return item.category === activeTab
  })

  const currentConfig = AMBIENT_SOUND_CONFIGS[ambientPreset]
  const isPlaying = ambientEnabled && ambientPreset !== 'off'

  return (
    <div className="space-y-3.5 pb-2">
      {/* 白噪音总开关核心控制卡片 */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            {isPlaying ? <CloudRain className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">白噪音伴读</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  isPlaying
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {isPlaying ? '已开启' : '已关闭'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isPlaying
                ? `正在播放：${currentConfig?.name || '自然音'}`
                : '默认静音，点击开关或音源一键启用'}
            </p>
          </div>
        </div>

        {/* 显式 iOS 风格切换开关 */}
        <button
          type="button"
          role="switch"
          aria-checked={isPlaying}
          onClick={onToggleEnabled}
          className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative shrink-0 ${
            isPlaying ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'
          }`}
          title={isPlaying ? '点击关闭白噪音' : '点击开启白噪音'}
        >
          <div
            className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
              isPlaying ? 'translate-x-5.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {/* 分类快捷标签 */}
      <div className="flex items-center gap-1.5 px-0.5 overflow-x-auto [scrollbar-width:none]">
        {(
          [
            { id: 'all', label: '全部音源' },
            { id: 'nature', label: '自然天籁' },
            { id: 'scene', label: '沉浸场景' },
            { id: 'noise', label: '声学色噪' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#1b88ee] text-white shadow-sm'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 音源网格 */}
      <div className="grid grid-cols-5 gap-2">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isItemActive = isPlaying ? ambientPreset === item.id : item.id === 'off'
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPreset(item.id)}
              className={`py-2.5 px-1 rounded-2xl text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                isItemActive ? accentActivePillCls : pillIdleCls
              }`}
              title={item.desc}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate text-[11px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 当前播放描述提示 */}
      {isPlaying && currentConfig && (
        <div className="px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-slate-300">当前：{currentConfig.name}</span>
          <span className="text-emerald-400 font-mono text-[10px]">{currentConfig.description}</span>
        </div>
      )}

      {/* 音量滑块 */}
      <div className={`flex items-center gap-3 px-1 pt-1 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-40'}`}>
        <Volume2 className={`w-4 h-4 shrink-0 ${mutedTextCls}`} />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={ambientVolume}
          disabled={!isPlaying}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="flex-1 accent-[#1b88ee] h-1.5 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className={`text-xs font-mono w-10 text-right ${mutedTextCls}`}>
          {Math.round(ambientVolume * 100)}%
        </span>
      </div>
    </div>
  )
}
