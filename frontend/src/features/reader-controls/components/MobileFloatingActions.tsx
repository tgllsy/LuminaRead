import React from 'react'

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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-end gap-3 px-5 pb-3"
    >
      {onOpenAI && (
        <button
          type="button"
          onClick={onOpenAI}
          title="AI 伴读与防剧透星图"
          className="w-12 h-12 rounded-full bg-[#4a4e54]/88 hover:bg-[#3a3e44] text-white backdrop-blur-md shadow-lg flex items-center justify-center font-sans font-semibold text-sm tracking-tight transition-transform active:scale-95"
        >
          <span>AI</span>
          <sup className="text-[10px] font-bold -top-1.5 ml-0.5">+</sup>
        </button>
      )}
      {onOpenTTS && (
        <button
          type="button"
          onClick={onOpenTTS}
          title={isTtsActive ? '展开正在播放的伴读面板' : '打开阅境伴读听书'}
          className={`relative w-12 h-12 rounded-full backdrop-blur-md shadow-lg flex items-center justify-center font-sans text-base font-medium transition-transform active:scale-95 ${
            isTtsActive
              ? isDark
                ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/25 font-bold'
                : 'bg-emerald-700 text-white ring-4 ring-emerald-600/25 font-bold'
              : 'bg-[#4a4e54]/88 hover:bg-[#3a3e44] text-white'
          }`}
        >
          <span>听</span>
          {isTtsActive && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
          )}
        </button>
      )}
    </div>
  )
}
