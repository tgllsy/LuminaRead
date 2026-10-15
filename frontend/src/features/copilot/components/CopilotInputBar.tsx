import React from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'

interface CopilotInputBarProps {
  value: string
  onChange: (val: string) => void
  onSubmit: (prompt?: string) => void
  loading: boolean
  isDark: boolean
}

const QUICK_PROMPTS = [
  '📌 核心论点提炼',
  '💡 大白话通俗解释',
  '🔍 梳理推导逻辑',
  '❓ 启发性质疑反思',
]

export const CopilotInputBar: React.FC<CopilotInputBarProps> = ({
  value,
  onChange,
  onSubmit,
  loading,
  isDark,
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const text = value.trim()
    if (!text) {
      onSubmit('请结合当前阅读进度与选段，深入浅出地讲解核心要点与思考启发。')
      onChange('')
      return
    }
    onSubmit(text)
    onChange('')
  }

  return (
    <div
      className={`border-t shrink-0 flex flex-col gap-2 p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:px-5 sm:py-3.5 ${
        isDark ? 'bg-[#1c1c1e] border-white/8' : 'bg-white border-slate-100'
      }`}
    >
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <Sparkles className="w-3 h-3 text-[#1b88ee] shrink-0 ml-0.5" />
        <span className="text-[10px] text-slate-400 shrink-0 select-none mr-0.5">快捷提问:</span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => {
              const text = prompt.replace(/^[^\s]+\s*/, '')
              onChange('')
              onSubmit(text)
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors select-none ${
              isDark
                ? 'bg-[#2c2c2e] text-slate-300 hover:text-white hover:bg-[#38383c]'
                : 'bg-slate-100 text-slate-600 hover:text-[#1b88ee] hover:bg-blue-50'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} className="flex items-center gap-2 w-full">
        <input
          type="text"
          value={value}
          disabled={loading}
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          placeholder={loading ? 'AI 正在思考分析中...' : '向 AI 提问本段核心、背景、疑问，或直接点击提问...'}
          className={`flex-1 min-w-0 h-10 px-4 rounded-full text-xs sm:text-[13px] focus:outline-none transition-colors ${
            isDark
              ? 'bg-[#2c2c2e] text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-[#1b88ee]'
              : 'bg-[#f2f3f5] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-[#1b88ee]'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-4 rounded-full bg-[#1b88ee] hover:bg-[#1477d6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>思考中</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>提问</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
