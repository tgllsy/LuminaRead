import React from 'react'
import { getHeatmapLevelColor, formatHeatmapTooltip, formatDateShort } from '../helpers'
import type { HeatmapCell } from '../types'

interface ReadingHeatmapProps {
  heatmap: HeatmapCell[]
}

const HEATMAP_LEGEND_LEVELS = [0, 1, 2, 3, 4] as const

export const ReadingHeatmap: React.FC<ReadingHeatmapProps> = ({ heatmap }) => {
  return (
    <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
          近 35 天阅读热力图
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
          <span>少</span>
          {HEATMAP_LEGEND_LEVELS.map((lvl) => (
            <span
              key={lvl}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs border ${getHeatmapLevelColor(lvl)}`}
            />
          ))}
          <span>多</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {heatmap.map((cell) => {
          const colorClass = getHeatmapLevelColor(cell.level)
          const tooltip = formatHeatmapTooltip(cell.date, cell.minutes, cell.words)
          const dateLabel = formatDateShort(cell.date)

          return (
            <div
              key={cell.date}
              title={tooltip}
              className={`py-1 px-1 sm:p-1.5 rounded-md border flex flex-col items-center justify-center min-w-0 transition-transform hover:scale-105 ${colorClass} ${
                cell.level >= 3 ? 'text-white' : 'text-slate-800'
              }`}
            >
              <span className="text-[8px] sm:text-[10px] font-mono opacity-75 truncate">
                {dateLabel}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold leading-tight truncate">
                {cell.minutes > 0 ? `${cell.minutes}m` : '·'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
