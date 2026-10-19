import React from 'react'
import { Sparkles, Headphones } from 'lucide-react'

export interface MobileFloatingActionsProps {
  onOpenAI?: () => void
  onOpenTTS?: () => void
  isTtsActive?: boolean
  isDark: boolean
}

export const MobileFloatingActions: React.FC<MobileFloatingActionsProps> = ({
  onOpenAI,
  onOpenTTS,
  isTtsActive,
  isDark,
}) => {
  if (!onOpenAI && !onOpenTTS) return null

  const neutralPillCls = isDark
    ? 'bg-slate-800/95 hover:bg-slate-700 text-slate-100 border border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.5)]'
    : 'bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/60 shadow-[0_6px_20px_rgba(15,23,42,0.22)]'

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-end gap-2.5 px-5 pb-3"
    >
      {onOpenAI && (
        <button
          type="button"
          onClick={onOpenAI}
          title="AI 伴读与防剧透星图"
          className={`h-11 px-4 rounded-full backdrop-blur-md flex items-center justify-center gap-1.5 font-sans font-bold text-xs tracking-tight transition-all active:scale-95 cursor-pointer ${neutralPillCls}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>AI 伴读</span>
        </button>
      )}
      {onOpenTTS && (
        <button
          type="button"
          onClick={onOpenTTS}
          title={isTtsActive ? '展开正在播放的伴读面板' : '打开阅境伴读听书'}
          className={`relative h-11 px-4 rounded-full backdrop-blur-md flex items-center justify-center gap-1.5 font-sans text-xs font-bold transition-all active:scale-95 cursor-pointer ${
            isTtsActive
              ? 'bg-emerald-600 text-white border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/30'
              : 'bg-[#1b88ee] hover:bg-[#1575ce] text-white border border-sky-300/30 shadow-[0_6px_20px_rgba(27,136,238,0.32)]'
          }`}
        >
          <Headphones className="w-4 h-4 text-white shrink-0" />
          <span>{isTtsActive ? '伴读中' : '听书'}</span>
          {isTtsActive && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-300 border-2 border-white dark:border-slate-900 animate-pulse" />
          )}
        </button>
      )}
    </div>
  )
}

