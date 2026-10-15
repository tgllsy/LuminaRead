import React from 'react'
import { Highlighter, ArrowRight } from 'lucide-react'
import type { HighlightItem, JumpTarget } from '../types'

interface HighlightHitsListProps {
  hits: HighlightItem[]
  query: string
  asPage: boolean
  onClose: () => void
  onJumpToResult: (target: JumpTarget) => void
}

export const HighlightHitsList: React.FC<HighlightHitsListProps> = ({
  hits,
  query,
  asPage,
  onClose,
  onJumpToResult,
}) => {
  if (hits.length === 0) return null

  return (
    <div className="space-y-2.5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Highlighter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        命中的划线与想法批注 ({hits.length})
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {hits.map((hl) => (
          <div
            key={hl.id}
            onClick={() => {
              onJumpToResult({
                bookId: hl.book_id,
                chapterIndex: hl.chapter_index,
                paragraphIndex: hl.paragraph_index,
                highlightKeyword: query,
              })
              if (!asPage) onClose()
            }}
            className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-900">《{hl.book_title}》</span>
                <span className="text-slate-500">· {hl.chapter_title}</span>
              </div>
              <p className="text-xs text-slate-800 line-clamp-2 font-serif">
                “{hl.selected_text}”
              </p>
              {hl.note && (
                <p className="text-[11px] text-amber-800 font-medium">💡 想法：{hl.note}</p>
              )}
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-semibold border border-amber-300 shrink-0 whitespace-nowrap self-start sm:self-center flex items-center gap-1">
              定位段落 <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
