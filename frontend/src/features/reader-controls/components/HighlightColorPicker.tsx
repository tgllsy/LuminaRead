import React from 'react'
import { Highlighter } from 'lucide-react'
import { HIGHLIGHT_COLORS, HIGHLIGHT_STYLES } from '../constants'
import type { HighlightColorPickerProps } from '../types'

export const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  color,
  styleType,
  isDark,
  onSelectColor,
  onSelectStyle,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5">
        <Highlighter className="w-3.5 h-3.5 text-slate-400" />
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectColor(c.id)}
            title={c.label}
            className={`w-5 h-5 rounded-full ${c.dot} transition-transform ${
              color === c.id
                ? isDark
                  ? 'ring-2 ring-white scale-110'
                  : 'ring-2 ring-slate-900 scale-110'
                : 'opacity-75 hover:opacity-100'
            }`}
          />
        ))}
      </div>

      <div
        className={`flex items-center gap-1 rounded-full p-0.5 ${
          isDark ? 'bg-[#2c2c2e]' : 'bg-[#f2f3f5]'
        }`}
      >
        {HIGHLIGHT_STYLES.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStyle(st.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              styleType === st.id
                ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>
    </div>
  )
}
