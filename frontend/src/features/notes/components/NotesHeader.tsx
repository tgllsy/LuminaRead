import React from 'react'
import {
  Highlighter,
  MessageSquareQuote,
  Sparkles,
  Bookmark,
  Plus,
  FileDown,
  Layers,
} from 'lucide-react'
import type { NotesHubOverviewResponse } from '../types'

interface NotesHeaderProps {
  stats?: NotesHubOverviewResponse['stats']
  selectedBookTitle?: string
  onOpenCreateNote: () => void
  onOpenAiWorkbench: () => void
  onExportMarkdown: () => void
  onExportLifeOs: () => void
}

export const NotesHeader: React.FC<NotesHeaderProps> = ({
  stats,
  selectedBookTitle,
  onOpenCreateNote,
  onOpenAiWorkbench,
  onExportMarkdown,
  onExportLifeOs,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              笔记与 AI
            </h2>
            {selectedBookTitle && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1b88ee]/10 text-[#1b88ee] border border-[#1b88ee]/20 truncate max-w-[180px]">
                {selectedBookTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            全书划线、随想笔记与 AI 问答记录
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAiWorkbench}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 提问</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1677d2] active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>写笔记</span>
          </button>

          <button
            type="button"
            onClick={onExportMarkdown}
            title="导出 Markdown"
            className="p-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onExportLifeOs}
            title="同步至 LifeOS"
            className="p-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Compact Metrics Bar */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="py-2 px-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] sm:text-xs">划线</span>
            <Highlighter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">{stats?.total_highlights || 0}</div>
        </div>

        <div className="py-2 px-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] sm:text-xs">随想</span>
            <MessageSquareQuote className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1b88ee] shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">{stats?.total_notes || 0}</div>
        </div>

        <div className="py-2 px-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] sm:text-xs">AI 对话</span>
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">{stats?.total_ai_conversations || 0}</div>
        </div>

        <div className="py-2 px-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] sm:text-xs">书签</span>
            <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">{stats?.total_bookmarks || 0}</div>
        </div>
      </div>
    </div>
  )
}
