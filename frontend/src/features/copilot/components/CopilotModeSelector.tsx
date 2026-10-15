import React from 'react'
import type { CopilotChatMode } from '../types'
import { COPILOT_PRESETS } from '../constants'

interface CopilotModeSelectorProps {
  currentMode: CopilotChatMode
  onSelectMode: (mode: CopilotChatMode) => void
  isDark: boolean
}

export const CopilotModeSelector: React.FC<CopilotModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  isDark,
}) => {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl ${
        isDark ? 'bg-[#1c1c1e]' : 'bg-[#eef0f4]'
      }`}
    >
      {COPILOT_PRESETS.map((m) => {
        const active = currentMode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMode(m.id)}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? 'bg-[#1b88ee] text-white shadow-2xs'
                : isDark
                ? 'text-slate-300 hover:bg-white/5'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
