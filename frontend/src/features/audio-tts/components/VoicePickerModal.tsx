import React from 'react'
import type { NeuralVoiceOption, VoiceCategory } from '../types'
import { VOICE_CATEGORY_TABS } from '../constants'

interface VoicePickerModalProps {
  voices: NeuralVoiceOption[]
  selectedVoice: string
  voiceCategory: VoiceCategory
  onSelectCategory: (category: VoiceCategory) => void
  onSelectVoice: (voiceId: string) => void
  pillIdleCls: string
  accentActivePillCls: string
  mutedTextCls: string
}

export const VoicePickerModal: React.FC<VoicePickerModalProps> = ({
  voices,
  selectedVoice,
  voiceCategory,
  onSelectCategory,
  onSelectVoice,
  pillIdleCls,
  accentActivePillCls,
  mutedTextCls,
}) => {
  const filteredVoices = voices.filter((v) => {
    if (voiceCategory === 'all') return true
    if (voiceCategory === 'recommended') return Boolean(v.recommended)
    if (voiceCategory === 'flagship') return v.category === 'flagship' || v.category === 'bilingual'
    return v.category === voiceCategory
  })

  return (
    <div className="space-y-3 overflow-hidden flex flex-col">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
        {VOICE_CATEGORY_TABS.map((tab) => {
          const label = tab.id === 'all' ? `全部 (${voices.length})` : tab.label
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectCategory(tab.id)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                voiceCategory === tab.id ? accentActivePillCls : pillIdleCls
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-0.5 pb-1">
        {filteredVoices.map((v) => {
          const active = selectedVoice === v.id
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVoice(v.id)}
              className={`p-3 rounded-2xl text-left transition-all flex items-center justify-between gap-2 ${
                active ? accentActivePillCls : pillIdleCls
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <span>{v.shortName || v.name}</span>
                  {v.id.startsWith('drama-') && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                      双角色
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    active ? 'opacity-90' : mutedTextCls
                  }`}
                >
                  {v.badge}
                </div>
              </div>
              {active && (
                <span className="px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-mono shrink-0">
                  当前
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
