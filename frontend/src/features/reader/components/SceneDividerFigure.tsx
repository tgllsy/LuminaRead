import React from 'react'

interface SceneDividerFigureProps {
  itemKey: string
  pIdx: number
  targetChIdx: number
}

export const SceneDividerFigure: React.FC<SceneDividerFigureProps> = ({
  itemKey,
  pIdx,
  targetChIdx,
}) => {
  return (
    <div
      key={itemKey}
      data-para-index={pIdx}
      data-chapter-index={targetChIdx}
      className="reader-block-contain break-inside-avoid my-6 sm:my-8 py-2 select-none flex items-center justify-center gap-3 sm:gap-4 text-current/35 hover:text-current/60 transition-colors"
      aria-hidden="true"
    >
      <span className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent via-current/25 to-current/40" />
      <span className="text-[11px] sm:text-xs font-serif tracking-[0.35em] text-current/60 select-none">
        ✦ ✦ ✦
      </span>
      <span className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent via-current/25 to-current/40" />
    </div>
  )
}
