import React from 'react'
import { Sparkles } from 'lucide-react'

interface CopilotEdgeTriggerProps {
  isOpen: boolean
  onClick: () => void
  theme?: string
  isHidden?: boolean
}

export const CopilotEdgeTrigger: React.FC<CopilotEdgeTriggerProps> = ({
  isOpen,
  onClick,
  theme = 'light',
  isHidden = false,
}) => {
  if (isHidden) return null
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      data-no-hud-toggle="true"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label="展开 AI 伴读侧边栏"
      className={`fixed top-[45%] right-0 -translate-y-1/2 z-30 flex items-center gap-1.5 py-3 px-2.5 rounded-l-2xl border-l border-y shadow-lg backdrop-blur-md cursor-pointer select-none transition-all duration-300 ease-out group ${
        isOpen
          ? 'translate-x-full opacity-0 pointer-events-none'
          : 'translate-x-0 opacity-85 hover:opacity-100 hover:-translate-x-1 shadow-[-4px_4px_16px_rgba(0,0,0,0.1)]'
      } ${
        isDark
          ? 'bg-[#1e1e24]/90 border-white/15 text-amber-300/90 hover:text-amber-200 hover:border-amber-400/40'
          : 'bg-white/95 border-slate-200/90 text-blue-600 hover:text-blue-700 hover:border-blue-400/40'
      }`}
      title="点击展开 AI 认知伴读边栏"
    >
      <div className="flex flex-col items-center gap-1">
        <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
        <span className="text-[11px] font-bold tracking-widest [writing-mode:vertical-rl] leading-none select-none py-0.5">
          AI伴读
        </span>
      </div>
    </button>
  )
}
