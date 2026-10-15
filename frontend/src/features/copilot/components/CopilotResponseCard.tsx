import React from 'react'
import { Loader2, CheckCircle2, MessageSquarePlus, Sparkles, ArrowUpRight } from 'lucide-react'
import type { CopilotResponse } from '../types'
import { renderFormattedMarkdown } from '../helpers'

interface CopilotResponseCardProps {
  loading: boolean
  response: CopilotResponse | null
  savedNotice: boolean
  onSaveAsNote: () => void
  onSelectFollowUp: (question: string) => void
  onJumpToCitation?: (chapterIndex: number, paragraphIndex: number) => void
  isDark: boolean
}

export const CopilotResponseCard: React.FC<CopilotResponseCardProps> = ({
  loading,
  response,
  savedNotice,
  onSaveAsNote,
  onSelectFollowUp,
  onJumpToCitation,
  isDark,
}) => {
  if (loading) {
    return (
      <div
        className={`p-8 rounded-2xl border flex flex-col items-center justify-center gap-2.5 text-xs ${
          isDark
            ? 'bg-[#1c1c1e] border-white/8 text-slate-400'
            : 'bg-white border-slate-200/80 text-slate-400'
        }`}
      >
        <Loader2 className="w-5 h-5 text-[#1b88ee] animate-spin" />
        <span>AI 正在结合章节上下文深度解析...</span>
      </div>
    )
  }

  if (!response) return null

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
        isDark
          ? 'bg-[#1c1c1e] border-white/8'
          : 'bg-white border-slate-200/80 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-current/8">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#1b88ee] shrink-0" />
          <h3 className="text-sm font-bold truncate">{response.title}</h3>
        </div>

        <button
          type="button"
          onClick={onSaveAsNote}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors ${
            savedNotice
              ? 'bg-emerald-500 text-white'
              : 'bg-[#1b88ee]/12 text-[#1b88ee] hover:bg-[#1b88ee] hover:text-white'
          }`}
        >
          {savedNotice ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>已存入笔记</span>
            </>
          ) : (
            <>
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>存为想法笔记</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Formatted Content */}
      {renderFormattedMarkdown(response.content, isDark)}

      {/* RAG Citations (全书出处溯源) */}
      {response.citations && response.citations.length > 0 && (
        <div className="pt-2.5 border-t border-current/8 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>📚 全书检索出处与引用依据：</span>
            {onJumpToCitation && <span className="text-[10px] text-[#1b88ee]/80 font-normal">点击卡片直达原文</span>}
          </div>
          <div className="space-y-1.5">
            {response.citations.map((c, idx) => (
              <div
                key={idx}
                onClick={() => onJumpToCitation?.(c.chapter_index, c.paragraph_index)}
                className={`group p-2.5 rounded-xl text-xs border transition-all ${
                  onJumpToCitation
                    ? 'cursor-pointer hover:border-[#1b88ee]/60 hover:shadow-xs active:scale-[0.99]'
                    : ''
                } ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900/90'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-semibold text-[11px] text-[#1b88ee] truncate">
                    {c.chapter_title} · 段落 #{c.paragraph_index + 1}
                  </span>
                  {onJumpToCitation && (
                    <span className="shrink-0 text-[10px] text-slate-400 group-hover:text-[#1b88ee] flex items-center gap-0.5 transition-colors">
                      <span>跳转</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 text-slate-500 dark:text-slate-400 italic">
                  “{c.snippet}”
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Suggestion Chips */}
      {response.follow_ups && response.follow_ups.length > 0 && (
        <div
          className={`pt-3 border-t space-y-2 ${
            isDark ? 'border-white/8' : 'border-slate-100'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">猜你想问：</div>
          <div className="flex flex-wrap gap-1.5">
            {response.follow_ups.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSelectFollowUp(q)}
                className={`px-3 py-1.5 rounded-full text-xs text-left transition-colors flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-[#25262b] text-blue-300 hover:bg-[#1b88ee]/20'
                    : 'bg-[#f2f5fa] text-[#1b88ee] hover:bg-[#1b88ee]/12'
                }`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
