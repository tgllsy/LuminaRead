import React, { useState } from 'react'
import { Sparkles, ChevronRight, User } from 'lucide-react'
import type { NeuralVoiceOption, AmbientPreset } from '../types'
import { DEFAULT_VOICES } from '../constants'
import { AmbientMixerWidget } from './AmbientMixerWidget'
import { TheaterVoiceLibraryModal } from './TheaterVoiceLibraryModal'

interface TheaterLeftStageProps {
  title: string
  author: string
  coverUrl?: string
  coverColor: string
  isPlaying: boolean
  effectiveVoice: string
  voices?: NeuralVoiceOption[]
  onVoiceChange: (voiceId: string) => void
  ambientPreset?: AmbientPreset
  ambientVolume?: number
  onSelectAmbientPreset?: (preset: AmbientPreset) => void
  onChangeAmbientVolume?: (vol: number) => void
  rainVol?: number
  fireVol?: number
  windVol?: number
  onChangeRain?: (val: number) => void
  onChangeFire?: (val: number) => void
  onChangeWind?: (val: number) => void
  onOpenAmbientModal?: () => void
  ambientEnabled?: boolean
  onToggleAmbientEnabled?: () => void
  externalVoiceModalOpen?: boolean
  onSetExternalVoiceModalOpen?: (open: boolean) => void
}

const QUICK_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 (女声)', tag: '温润细腻' },
  { id: 'zh-CN-YunxiNeural', name: '云希 (男声)', tag: '沉稳浑厚' },
  { id: 'zh-CN-YunjianNeural', name: '云健 (男声)', tag: '磁性演播' },
  { id: 'drama-yunxi-xiaoxiao', name: '广播剧 (双角)', tag: '叙事+对白' },
]

export const TheaterLeftStage: React.FC<TheaterLeftStageProps> = ({
  title,
  author,
  coverUrl,
  coverColor,
  isPlaying,
  effectiveVoice,
  voices = DEFAULT_VOICES,
  onVoiceChange,
  ambientPreset,
  ambientVolume,
  onSelectAmbientPreset,
  onChangeAmbientVolume,
  rainVol,
  fireVol,
  windVol,
  onChangeRain,
  onChangeFire,
  onChangeWind,
  onOpenAmbientModal,
  ambientEnabled,
  onToggleAmbientEnabled,
  externalVoiceModalOpen,
  onSetExternalVoiceModalOpen,
}) => {
  const [internalShowVoiceLibrary, setInternalShowVoiceLibrary] = useState(false)
  const showVoiceLibrary = externalVoiceModalOpen ?? internalShowVoiceLibrary
  const setShowVoiceLibrary = onSetExternalVoiceModalOpen ?? setInternalShowVoiceLibrary

  const activeVoiceObj = voices.find((v) => v.id === effectiveVoice)

  return (
    <>
      <div className="hidden lg:flex w-[400px] border-r border-white/10 p-6 flex-col justify-between overflow-y-auto bg-gradient-to-b from-slate-900/40 to-black/60 shrink-0 space-y-6">
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#1b88ee]/30 to-amber-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
            <div
              className="relative w-44 h-60 rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-4 flex flex-col justify-between"
              style={{ backgroundColor: coverColor }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="relative z-10 text-[10px] text-amber-300 font-mono tracking-wider uppercase">AUDIOBOOK</div>
                  <div className="relative z-10">
                    <h3 className="font-serif font-bold text-lg leading-snug text-white line-clamp-2">{title}</h3>
                    <p className="text-xs text-slate-300 mt-1 truncate">{author}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sound Wave */}
          <div className="flex items-center gap-1 h-7 mt-5">
            {[3, 6, 4, 7, 5, 2, 6, 4, 8, 3].map((h, i) => (
              <span
                key={i}
                className={`w-1 bg-[#1b88ee] rounded-full ${isPlaying ? 'animate-bounce' : 'opacity-40'}`}
                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>音色方案</span>
              <button
                type="button"
                onClick={() => setShowVoiceLibrary(true)}
                className="text-amber-400 hover:text-amber-300 font-normal flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>完整音库 ({voices.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick voices grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {QUICK_VOICES.map((qv) => {
                const isSelected = effectiveVoice === qv.id
                return (
                  <button
                    key={qv.id}
                    type="button"
                    onClick={() => onVoiceChange(qv.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1b88ee] bg-[#1b88ee]/20 text-white font-bold shadow-md shadow-blue-500/20'
                        : 'border-white/10 hover:border-white/25 bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="truncate">{qv.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal truncate">{qv.tag}</div>
                  </button>
                )
              })}
            </div>

            {/* Current Active Voice Banner (if not one of quick presets) */}
            {activeVoiceObj && !QUICK_VOICES.some((q) => q.id === effectiveVoice) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-amber-300 truncate flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{activeVoiceObj.shortName || activeVoiceObj.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{activeVoiceObj.badge}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoiceLibrary(true)}
                  className="px-2 py-1 rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 text-[10px] font-medium shrink-0"
                >
                  更换
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowVoiceLibrary(true)}
              className="w-full py-2 px-3 rounded-xl border border-white/10 hover:border-[#1b88ee]/50 bg-white/5 hover:bg-[#1b88ee]/10 text-slate-300 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>浏览全部 {voices.length} 款神经拟真音色</span>
            </button>
          </div>

          <AmbientMixerWidget
            ambientPreset={ambientPreset}
            ambientVolume={ambientVolume}
            onSelectPreset={onSelectAmbientPreset}
            onVolumeChange={onChangeAmbientVolume}
            rainVol={rainVol}
            fireVol={fireVol}
            windVol={windVol}
            onChangeRain={onChangeRain}
            onChangeFire={onChangeFire}
            onChangeWind={onChangeWind}
            onOpenMoreSounds={onOpenAmbientModal}
            ambientEnabled={ambientEnabled}
            onToggleEnabled={onToggleAmbientEnabled}
          />
        </div>
      </div>

      <TheaterVoiceLibraryModal
        isOpen={showVoiceLibrary}
        onClose={() => setShowVoiceLibrary(false)}
        voices={voices}
        selectedVoice={effectiveVoice}
        onSelectVoice={onVoiceChange}
      />
    </>
  )
}
