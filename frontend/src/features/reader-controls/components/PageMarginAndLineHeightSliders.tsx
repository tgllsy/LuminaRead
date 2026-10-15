import React from 'react'
import {
  PAGE_WIDTH_BOUNDS,
  LINE_HEIGHT_BOUNDS,
} from '../constants'
import { marginRatioToPageWidth } from '../helpers'
import type { ReaderTypography } from '../types'

export interface PageMarginAndLineHeightSlidersProps {
  isDark: boolean
  pageWidth: number
  marginRatio: number
  lineHeight: number
  lhRatio: number
  lhClamped: number
  onChange: (patch: Partial<ReaderTypography>) => void
}

export const PageMarginAndLineHeightSliders: React.FC<
  PageMarginAndLineHeightSlidersProps
> = ({
  isDark,
  pageWidth,
  marginRatio,
  lineHeight,
  lhRatio,
  lhClamped,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left Pill: 边距 */}
      <div
        className={`h-12 rounded-full px-3 flex items-center justify-between relative select-none ${
          isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
        }`}
      >
        <button
          type="button"
          onClick={() =>
            onChange({
              pageWidth: Math.min(
                PAGE_WIDTH_BOUNDS.max,
                pageWidth + PAGE_WIDTH_BOUNDS.step
              ),
            })
          }
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#1b88ee] z-30 px-1 cursor-pointer"
          title="减小边距"
        >
          小
        </button>

        <div className="flex-1 relative h-full flex items-center mx-1">
          <div className="w-full h-1.5 rounded-full bg-slate-300/60 dark:bg-slate-700 overflow-hidden pointer-events-none">
            <div
              style={{ width: `${marginRatio * 100}%` }}
              className="h-full bg-[#1b88ee]/45 rounded-full"
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(marginRatio * 100)}
            onChange={(e) => {
              const r = Number(e.target.value) / 100
              onChange({ pageWidth: marginRatioToPageWidth(r) })
            }}
            aria-label="页面边距"
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 m-0"
          />
          <div
            style={{
              left: `calc(${marginRatio * 100}% - ${marginRatio * 40}px)`,
            }}
            className={`absolute top-1/2 -translate-y-1/2 w-[40px] h-9 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.14)] flex items-center justify-center text-[11px] font-semibold pointer-events-none z-20 ${
              isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'
            }`}
          >
            边距
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              pageWidth: Math.max(
                PAGE_WIDTH_BOUNDS.min,
                pageWidth - PAGE_WIDTH_BOUNDS.step
              ),
            })
          }
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#1b88ee] z-30 px-1 cursor-pointer"
          title="增大边距"
        >
          大
        </button>
      </div>

      {/* Right Pill: 行距 */}
      <div
        className={`h-12 rounded-full px-3 flex items-center justify-between relative select-none ${
          isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
        }`}
      >
        <button
          type="button"
          onClick={() =>
            onChange({
              lineHeight: Number(
                Math.max(
                  LINE_HEIGHT_BOUNDS.min,
                  lineHeight - LINE_HEIGHT_BOUNDS.stepLarge
                ).toFixed(2)
              ),
            })
          }
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#1b88ee] z-30 px-1 cursor-pointer"
          title="收紧行距"
        >
          紧
        </button>

        <div className="flex-1 relative h-full flex items-center mx-1">
          <div className="w-full h-1.5 rounded-full bg-slate-300/60 dark:bg-slate-700 overflow-hidden pointer-events-none">
            <div
              style={{ width: `${lhRatio * 100}%` }}
              className="h-full bg-[#1b88ee]/45 rounded-full"
            />
          </div>
          <input
            type="range"
            min={LINE_HEIGHT_BOUNDS.min}
            max={LINE_HEIGHT_BOUNDS.max}
            step={LINE_HEIGHT_BOUNDS.step}
            value={lhClamped}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            aria-label="段落行距"
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 m-0"
          />
          <div
            style={{
              left: `calc(${lhRatio * 100}% - ${lhRatio * 40}px)`,
            }}
            className={`absolute top-1/2 -translate-y-1/2 w-[40px] h-9 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.14)] flex items-center justify-center text-[11px] font-mono font-semibold pointer-events-none z-20 ${
              isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'
            }`}
          >
            {lineHeight.toFixed(2)}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              lineHeight: Number(
                Math.min(
                  LINE_HEIGHT_BOUNDS.max,
                  lineHeight + LINE_HEIGHT_BOUNDS.stepLarge
                ).toFixed(2)
              ),
            })
          }
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#1b88ee] z-30 px-1 cursor-pointer"
          title="放宽行距"
        >
          松
        </button>
      </div>
    </div>
  )
}
