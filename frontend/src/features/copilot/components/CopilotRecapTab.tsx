import React from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import type { SpoilerFreeRecapData, CharacterNode } from '../types'
import { CopilotConstellationGraph } from './CopilotConstellationGraph'
import { CopilotNodeDetailCard } from './CopilotNodeDetailCard'
import { CopilotRecapTimeline } from './CopilotRecapTimeline'

interface CopilotRecapTabProps {
  recapData: SpoilerFreeRecapData | null
  recapLoading?: boolean
  recapError?: string | null
  onRetry?: () => void
  selectedChar: CharacterNode | null
  onSelectChar: (char: CharacterNode) => void
  isDark: boolean
}

export const CopilotRecapTab: React.FC<CopilotRecapTabProps> = ({
  recapData,
  recapLoading = false,
  recapError,
  onRetry,
  selectedChar,
  onSelectChar,
  isDark,
}) => {
  if (recapError && !recapData) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-3 min-h-[240px]">
        <span className="text-rose-500 font-medium">{recapError}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            点击重试
          </button>
        )}
      </div>
    )
  }

  if (!recapData || recapLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2.5 min-h-[240px]">
        <Loader2 className="w-5 h-5 text-[#1b88ee] animate-spin" />
        <span>正在提取已读章节脉络与核心图谱...</span>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 ${
        isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
      }`}
    >
      {/* Compact Spoiler Lock Banner */}
      <div
        className={`px-3.5 py-2.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
          isDark
            ? 'bg-[#1b88ee]/10 border-[#1b88ee]/25 text-blue-200'
            : 'bg-[#eef6ff] border-[#cfe4ff] text-[#1464b8]'
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-[#1b88ee] shrink-0" />
        <span className="leading-snug">
          防剧透物理隔离已启用：仅分析前{' '}
          <strong>{recapData.visible_chapters_count}</strong> 章已读内容，后续{' '}
          <strong>{recapData.hidden_chapters_count}</strong> 章未读内容已屏蔽
        </span>
      </div>

      {/* Interactive Constellation Graph + Node Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
        <CopilotConstellationGraph
          recapData={recapData}
          selectedChar={selectedChar}
          onSelectChar={onSelectChar}
          isDark={isDark}
        />
        <CopilotNodeDetailCard selectedChar={selectedChar} isDark={isDark} />
      </div>

      {/* Chapter-by-Chapter Recap Timeline */}
      <CopilotRecapTimeline
        visibleChaptersCount={recapData.visible_chapters_count}
        recapPoints={recapData.recap_points}
        isDark={isDark}
      />
    </div>
  )
}
