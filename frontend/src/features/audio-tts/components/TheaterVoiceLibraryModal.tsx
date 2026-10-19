import React, { useState, useMemo } from 'react'
import { Search, Check, Volume2, Users } from 'lucide-react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import type { NeuralVoiceOption, VoiceCategory } from '../types'
import { VOICE_CATEGORY_TABS } from '../constants'

interface TheaterVoiceLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  voices: NeuralVoiceOption[]
  selectedVoice: string
  onSelectVoice: (voiceId: string) => void
}

export const TheaterVoiceLibraryModal: React.FC<TheaterVoiceLibraryModalProps> = ({
  isOpen,
  onClose,
  voices,
  selectedVoice,
  onSelectVoice,
}) => {
  const [activeCategory, setActiveCategory] = useState<VoiceCategory>('all')
  const [keyword, setKeyword] = useState('')

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      if (activeCategory === 'recommended' && !v.recommended) return false
      if (activeCategory === 'flagship' && v.category !== 'flagship') return false
      if (activeCategory === 'drama' && v.category !== 'drama' && !v.id.startsWith('drama-')) return false
      if (activeCategory === 'podcast' && v.category !== 'podcast') return false
      if (activeCategory === 'dialect' && v.category !== 'dialect') return false
      if (activeCategory === 'bilingual' && v.category !== 'bilingual') return false

      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase()
        const text = `${v.name} ${v.shortName} ${v.badge} ${v.description} ${v.gender}`.toLowerCase()
        if (!text.includes(kw)) return false
      }
      return true
    })
  }, [voices, activeCategory, keyword])

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`微软 Edge 神经拟真声源库（共 ${voices.length} 款）`}
      subtitle="超拟真神经网络语调，自然呼吸停顿与情绪起伏"
      isDark={true}
      maxWidthClass="md:max-w-3xl"
    >
      <div className="p-4 sm:p-6 flex flex-col max-h-[72dvh] overflow-hidden space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-none">
            {VOICE_CATEGORY_TABS.map((tab) => {
              const active = activeCategory === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1b88ee] text-white font-bold shadow-md shadow-blue-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索声线或场景..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1b88ee] transition-all"
            />
          </div>
        </div>

        {/* Voice grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredVoices.map((v) => {
            const isSelected = selectedVoice === v.id
            const isDrama = v.id.startsWith('drama-')
            return (
              <div
                key={v.id}
                onClick={() => {
                  onSelectVoice(v.id)
                  onClose()
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                  isSelected
                    ? 'border-amber-400/80 bg-amber-400/10 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                        {v.name}
                      </span>
                      {isDrama && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 shrink-0 flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" />
                          <span>广播剧</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-400/90 font-medium mt-0.5 truncate">{v.badge}</div>
                  </div>
                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>使用中</span>
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-white shrink-0">
                      <Volume2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{v.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}
