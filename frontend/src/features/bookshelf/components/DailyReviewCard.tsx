import React from 'react'
import { Sparkles, RefreshCw, ArrowUpRight, Quote, MessageSquareQuote, ChevronDown, ChevronUp } from 'lucide-react'
import type { JumpTarget, HighlightItem } from '../../../types'
import { useDailyReview } from '../hooks/useDailyReview'

interface DailyReviewCardProps {
  onJumpToHighlight: (target: JumpTarget) => void
  onOpenNotesHub?: () => void
}

const COLOR_BADGE_MAP: Record<string, string> = {
  yellow: 'border-l-amber-400 bg-amber-50/50',
  blue: 'border-l-blue-500 bg-blue-50/50',
  pink: 'border-l-rose-400 bg-rose-50/50',
  green: 'border-l-emerald-500 bg-emerald-50/50',
  purple: 'border-l-purple-500 bg-purple-50/50',
}

export const DailyReviewCard: React.FC<DailyReviewCardProps> = ({
  onJumpToHighlight,
  onOpenNotesHub,
}) => {
  const { reviews, loading, expanded, fetchReviews, toggleExpanded } = useDailyReview()
  if (reviews.length === 0) return null

  return (
    <div className="bg-white/80 backdrop-blur-xs rounded-2xl border border-slate-200/70 px-4 py-3 transition-all">
      <div onClick={toggleExpanded} className="flex items-center justify-between gap-3 cursor-pointer select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[11px] font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>笔记回顾</span>
          </span>
          {!expanded && reviews[0] ? (
            <p className="text-xs text-slate-600 truncate font-serif">
              “{reviews[0].selected_text}”
              <span className="text-slate-400 font-sans ml-1.5">— 《{reviews[0].book_title}》</span>
            </p>
          ) : (
            <span className="text-xs font-medium text-slate-500 truncate">共 {reviews.length} 条过往划线与想法</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenNotesHub && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenNotesHub() }}
              className={`${expanded ? 'flex' : 'hidden sm:flex'} px-2 sm:px-2.5 py-1 rounded-full bg-[#1b88ee]/10 hover:bg-[#1b88ee]/20 active:bg-[#1b88ee]/30 text-[#1b88ee] text-xs font-semibold items-center gap-1 transition-all active:scale-[0.97] cursor-pointer`}
            >
              <span className="hidden sm:inline">笔记 · 问书中心</span>
              <span className="sm:hidden">问书中心</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {expanded && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fetchReviews() }}
              disabled={loading}
              className="px-2 sm:px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-xs font-medium text-slate-600 flex items-center gap-1 transition-all active:scale-[0.97] cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">换一批</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleExpanded() }}
            className="px-2 sm:px-2.5 py-1 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 text-xs font-medium flex items-center gap-0.5 transition-all active:scale-[0.97] cursor-pointer"
          >
            <span>{expanded ? '收起' : '展开'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5 pt-3.5 border-t border-slate-100">
          {reviews.map((item) => (
            <ReviewCardItem key={item.id} item={item} onJumpToHighlight={onJumpToHighlight} />
          ))}
        </div>
      )}
    </div>
  )
}

const ReviewCardItem: React.FC<{
  item: HighlightItem
  onJumpToHighlight: (target: JumpTarget) => void
}> = ({ item, onJumpToHighlight }) => (
  <div
    onClick={() =>
      onJumpToHighlight({
        bookId: item.book_id,
        chapterIndex: item.chapter_index,
        paragraphIndex: item.paragraph_index,
        highlightKeyword: item.selected_text.slice(0, 12),
      })
    }
    className={`group cursor-pointer rounded-xl p-3.5 border border-slate-200/80 border-l-4 transition-all hover:shadow-md hover:border-blue-300 flex flex-col justify-between ${
      COLOR_BADGE_MAP[item.color] || COLOR_BADGE_MAP.yellow
    }`}
  >
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700 truncate">
          《{item.book_title || '馆藏图书'}》
        </span>
        <span className="inline-flex items-center gap-0.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
          跳转原文 <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>

      <p className="text-xs text-slate-800 leading-relaxed line-clamp-3 font-serif">
        <Quote className="w-3 h-3 inline mr-1 text-slate-400" />
        {item.selected_text}
      </p>

      {item.note && (
        <div className="p-2 rounded-lg bg-white/80 border border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1.5">
          <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{item.note}</span>
        </div>
      )}
    </div>

    <div className="pt-2 mt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
      <span className="truncate">{item.chapter_title}</span>
      <span>{item.book_author}</span>
    </div>
  </div>
)
