import React, { useState } from 'react'
import { X, Sparkles, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import type { SelectionAnchorRect } from '../../reader-controls/types'
import { getSurfaceClass } from '../../reader-controls/helpers'

interface EntityWikiPopoverProps {
  term: string
  quickDef: string | null
  aiExplanation: string | null
  loading: boolean
  anchorRect?: SelectionAnchorRect | null
  isDark: boolean
  onClose: () => void
  onDeepCopilot: (term: string) => void
}

export const EntityWikiPopover: React.FC<EntityWikiPopoverProps> = ({
  term,
  quickDef,
  aiExplanation,
  loading,
  anchorRect,
  isDark,
  onClose,
  onDeepCopilot,
}) => {
  const [copied, setCopied] = useState(false)
  const surfaceClass = getSurfaceClass(isDark)

  const handleCopy = () => {
    const textToCopy = aiExplanation || quickDef || term
    navigator.clipboard?.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 计算定位
  let floatingStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(420px, calc(100vw - 32px))',
  }

  if (anchorRect && typeof window !== 'undefined' && window.innerWidth >= 640) {
    const top = Math.min(window.innerHeight - 320, Math.max(70, anchorRect.bottom + 8))
    const left = Math.min(window.innerWidth - 420, Math.max(16, anchorRect.left))
    floatingStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: '380px',
    }
  }

  const contentText = aiExplanation || quickDef

  return (
    <div
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={floatingStyle}
      className={`z-[65] rounded-3xl backdrop-blur-xl p-4 border space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${surfaceClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-current/10 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>AI 百科</span>
          </span>
          <h3 className="font-bold text-sm tracking-tight truncate">{term}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-current/50 hover:text-current hover:bg-current/10 transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="text-xs sm:text-sm leading-relaxed max-h-[220px] overflow-y-auto pr-1 space-y-2 opacity-90 select-text font-serif">
        {contentText ? (
          <p className="whitespace-pre-wrap">{contentText}</p>
        ) : loading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-current/60">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-xs font-sans">AI 正在提炼词条百科...</span>
          </div>
        ) : (
          <p className="italic text-current/50">暂未检索到该词条释义</p>
        )}

        {loading && contentText && (
          <div className="flex items-center gap-1.5 text-[11px] text-blue-500 font-sans pt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>AI 深度补充中...</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/10 text-xs">
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1.5 rounded-xl border border-current/15 hover:bg-current/5 flex items-center gap-1 font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制释义</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onDeepCopilot(term)
            onClose()
          }}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 transition-colors shadow-xs"
        >
          <span>深度伴读</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
