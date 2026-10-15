import React from 'react'
import { BookOpen } from 'lucide-react'
import type { RecapPoint } from '../types'

interface CopilotRecapTimelineProps {
  visibleChaptersCount: number
  recapPoints: RecapPoint[]
  isDark: boolean
}

export const CopilotRecapTimeline: React.FC<CopilotRecapTimelineProps> = ({
  visibleChaptersCount,
  recapPoints,
  isDark,
}) => {
  return (
    <div
      className={`rounded-2xl p-4 border space-y-3 ${
        isDark
          ? 'bg-[#1c1c1e] border-white/8'
          : 'bg-white border-slate-200/80 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3
          className={`text-xs font-bold flex items-center gap-1.5 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#1b88ee]" />
          <span>已读章节前情提要 (第 1 — {visibleChaptersCount} 章)</span>
        </h3>
      </div>

      <div className="space-y-2">
        {(Array.isArray(recapPoints) ? recapPoints : []).map((pt) => (
          <div
            key={pt.chapter_index}
            className={`p-3 rounded-xl flex items-start gap-3 ${
              isDark ? 'bg-[#25262b]' : 'bg-[#f7f8fa]'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#1b88ee]/12 text-[#1b88ee] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
              {(pt.chapter_index ?? 0) + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-bold">{pt.chapter_title}</div>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {pt.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
