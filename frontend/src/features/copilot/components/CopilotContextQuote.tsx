import React from 'react'

interface CopilotContextQuoteProps {
  effectiveAnchorText: string
  hasSelectedText: boolean
  isDark: boolean
}

export const CopilotContextQuote: React.FC<CopilotContextQuoteProps> = ({
  effectiveAnchorText,
  hasSelectedText,
  isDark,
}) => {
  return (
    <div
      className={`p-3.5 rounded-2xl border-l-4 border-l-[#1b88ee] border ${
        isDark
          ? 'bg-[#1c1c1e] border-white/8'
          : 'bg-white border-slate-200/80 shadow-2xs'
      }`}
    >
      <div className="text-[11px] font-semibold text-[#1b88ee] mb-1">
        {hasSelectedText ? '当前划选原文' : '当前章节伴读选段'}
      </div>
      <p
        className={`text-xs sm:text-[13px] font-serif line-clamp-3 leading-relaxed ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        “{effectiveAnchorText}”
      </p>
    </div>
  )
}
