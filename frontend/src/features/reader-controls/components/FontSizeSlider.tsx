import React from 'react'
import { FONT_SIZE_BOUNDS } from '../constants'
import type { ReaderTypography } from '../types'

export interface FontSizeSliderProps {
  fontSize: number
  fontRatio: number
  fontClamped: number
  isDark: boolean
  onChange: (patch: Partial<ReaderTypography>) => void
}

export const FontSizeSlider: React.FC<FontSizeSliderProps> = ({
  fontSize,
  fontRatio,
  fontClamped,
  isDark,
  onChange,
}) => {
  return (
    <div
      className={`h-12 rounded-full px-3.5 flex items-center justify-between relative select-none ${
        isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
      }`}
    >
      <button
        type="button"
        onClick={() =>
          onChange({
            fontSize: Math.max(
              FONT_SIZE_BOUNDS.min,
              fontSize - FONT_SIZE_BOUNDS.step
            ),
          })
        }
        className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 py-1 z-30 hover:text-[#1b88ee] cursor-pointer"
        title="减小字号"
      >
        A-
      </button>

      <div className="flex-1 relative h-full flex items-center mx-1.5">
        <div className="w-full h-1.5 rounded-full bg-slate-300/60 dark:bg-slate-700 overflow-hidden pointer-events-none">
          <div
            style={{ width: `${fontRatio * 100}%` }}
            className="h-full bg-[#1b88ee]/45 rounded-full"
          />
        </div>

        <input
          type="range"
          min={FONT_SIZE_BOUNDS.min}
          max={FONT_SIZE_BOUNDS.max}
          step={FONT_SIZE_BOUNDS.step}
          value={fontClamped}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          aria-label="字号大小"
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 m-0"
        />

        <div
          style={{
            left: `calc(${fontRatio * 100}% - ${fontRatio * 38}px)`,
          }}
          className={`absolute top-1/2 -translate-y-1/2 w-[38px] h-[38px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center text-xs font-bold pointer-events-none z-20 ${
            isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'
          }`}
        >
          {fontSize}
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({
            fontSize: Math.min(
              FONT_SIZE_BOUNDS.max,
              fontSize + FONT_SIZE_BOUNDS.step
            ),
          })
        }
        className="text-sm font-bold text-slate-600 dark:text-slate-300 px-2 py-1 z-30 hover:text-[#1b88ee] cursor-pointer"
        title="增大字号"
      >
        A+
      </button>
    </div>
  )
}
