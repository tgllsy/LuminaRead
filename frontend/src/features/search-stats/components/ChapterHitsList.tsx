import React from 'react'
import { BookOpen, ArrowRight } from 'lucide-react'
import type { FullTextChapterHit, JumpTarget } from '../types'

interface ChapterHitsListProps {
  hits: FullTextChapterHit[]
  query: string
  asPage: boolean
  onClose: () => void
  onJumpToResult: (target: JumpTarget) => void
}

export const ChapterHitsList: React.FC<ChapterHitsListProps> = ({
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
        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
        全库章节正文精准定位 ({hits.length})
      </h4>

      <div className="space-y-2">
        {hits.map((hit) => (
          <div
            key={hit.id}
            onClick={() => {
              onJumpToResult({
                bookId: hit.book_id,
                chapterIndex: hit.chapter_index,
                paragraphIndex: hit.paragraph_index,
                highlightKeyword: query,
              })
              if (!asPage) onClose()
            }}
            className="group p-4 rounded-xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-[#1b88ee] hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hit.cover_color || '#1e40af' }}
                />
                <span className="text-xs font-bold text-slate-900">
                  《{hit.book_title}》
                </span>
                <span className="text-xs text-slate-500">{hit.book_author}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {hit.chapter_title} · 第 {hit.paragraph_index + 1} 段
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  偏移 #{hit.char_offset}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                <span>{hit.snippet_before}</span>
                {hit.match_text ? (
                  <mark className="bg-amber-200 text-slate-950 font-bold px-1 py-0.5 rounded">
                    {hit.match_text}
                  </mark>
                ) : (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-sans font-medium">
                    书名/章节命中
                  </span>
                )}
                <span>{hit.snippet_after}</span>
              </p>
            </div>

            <button className="px-3.5 py-2 rounded-lg bg-white group-hover:bg-[#1b88ee] group-hover:text-white border border-slate-200/80 group-hover:border-transparent text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors self-start sm:self-center">
              直达该段
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
