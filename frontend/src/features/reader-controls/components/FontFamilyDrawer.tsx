import React from 'react'
import { Check, Languages } from 'lucide-react'
import { FONTS } from '../constants'
import type { ReaderTypography } from '../types'

export interface FontFamilyDrawerProps {
  isDark: boolean
  fontFamily?: ReaderTypography['fontFamily']
  currentFontFamily?: ReaderTypography['fontFamily']
  bilingualMode?: boolean
  isOpen?: boolean
  onClose?: () => void
  onChange: (patch: Partial<ReaderTypography>) => void
}

export const FontFamilyDrawer: React.FC<FontFamilyDrawerProps> = ({
  isDark,
  fontFamily,
  currentFontFamily,
  bilingualMode,
  isOpen = true,
  onChange,
}) => {
  if (isOpen === false) return null

  const activeFontId = fontFamily || currentFontFamily || 'serif'

  return (
    <div
      className={`p-2.5 rounded-2xl grid grid-cols-2 gap-2 max-h-64 overflow-y-auto ${
        isDark ? 'bg-slate-800/80' : 'bg-[#f7f8fa]'
      }`}
    >
      {FONTS.map((f) => {
        const active = activeFontId === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange({ fontFamily: f.id })}
            className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
              active
                ? `${f.className} bg-[#1b88ee] text-white font-semibold shadow-2xs`
                : isDark
                ? 'bg-slate-900/70 text-slate-300 hover:bg-slate-900'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="truncate">{f.label}</span>
            {active && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => onChange({ bilingualMode: !bilingualMode })}
        className={`col-span-2 px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
          bilingualMode
            ? 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold'
            : isDark
            ? 'bg-slate-900/70 text-slate-300'
            : 'bg-white text-slate-600'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5" />
          <span>段落级中英双语对照精排</span>
        </span>
        <span>{bilingualMode ? '已开启' : '关闭'}</span>
      </button>
    </div>
  )
}
